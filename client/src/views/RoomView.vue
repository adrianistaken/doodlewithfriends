<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { nanoid } from 'nanoid';
import { useWindowSize } from '@vueuse/core';
import DrawingCanvas from '../components/DrawingCanvas.vue';
import RemoteCursor from '../components/RemoteCursor.vue';
import Toolbar from '../components/Toolbar.vue';
import { useRoom } from '../composables/useRoom';
import { useSocket } from '../composables/useSocket';
import { clampScale, defaultViewport, type Viewport } from '../lib/viewport';
import type { ImageObject, Tool } from '../types/shared';

const props = defineProps<{ roomId: string }>();

const { socket, connected } = useSocket();
const { me, data } = useRoom(props.roomId);
const { width, height } = useWindowSize();

const tool = ref<Tool>('pen');
const color = ref('#111827');
const size = ref(4);

// DrawingCanvas overrides this immediately on mount with defaultViewport(w, h).
const viewport = ref<Viewport>({ scale: 1, x: 0, y: 0 });

const remoteCursors = computed(() =>
  data.users
    .filter((u) => u.id !== me.id && u.cursor)
    .map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      x: u.cursor!.x,
      y: u.cursor!.y,
    })),
);

function copyLink() {
  const url = `${window.location.origin}/room/${props.roomId}`;
  navigator.clipboard?.writeText(url).catch(() => {
    /* clipboard may be unavailable; silently ignore */
  });
}

function clearBoard() {
  data.strokes = [];
  data.images = [];
  socket.emit('board:clear', { roomId: props.roomId, userId: me.id });
}

function zoomBy(factor: number) {
  const w = width.value;
  const h = height.value;
  const oldScale = viewport.value.scale;
  const newScale = clampScale(oldScale * factor);
  if (newScale === oldScale) return;
  // Zoom around the screen center.
  const cx = w / 2;
  const cy = h / 2;
  const wx = (cx - viewport.value.x) / oldScale;
  const wy = (cy - viewport.value.y) / oldScale;
  viewport.value = {
    scale: newScale,
    x: cx - wx * newScale,
    y: cy - wy * newScale,
  };
}

function resetView() {
  viewport.value = defaultViewport(width.value, height.value);
}

const zoomPercent = computed(() => Math.round(viewport.value.scale * 100));

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 600;

async function addImageFromFile(file: File) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > MAX_IMAGE_BYTES) {
    alert('Image is too large (max 2MB).');
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const dimensions = await loadImageSize(dataUrl);
  const scale = dimensions.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / dimensions.width : 1;
  const imgWidth = Math.round(dimensions.width * scale);
  const imgHeight = Math.round(dimensions.height * scale);
  // Place at the current viewport center in world coords.
  const centerWorldX = (width.value / 2 - viewport.value.x) / viewport.value.scale;
  const centerWorldY = (height.value / 2 - viewport.value.y) / viewport.value.scale;
  const image: ImageObject = {
    id: nanoid(),
    userId: me.id,
    url: dataUrl,
    x: Math.round(centerWorldX - imgWidth / 2),
    y: Math.round(centerWorldY - imgHeight / 2),
    width: imgWidth,
    height: imgHeight,
    createdAt: Date.now(),
  };
  data.images.push(image);
  socket.emit('image:add', { roomId: props.roomId, image });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = url;
  });
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        addImageFromFile(file);
        return;
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('paste', onPaste);
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-white">
    <DrawingCanvas
      :viewport="viewport"
      :socket="socket"
      :room-id="roomId"
      :me="me"
      :users="data.users"
      :strokes="data.strokes"
      :images="data.images"
      :tool="tool"
      :color="color"
      :size="size"
      @update:viewport="viewport = $event"
    />
    <RemoteCursor
      v-for="cursor in remoteCursors"
      :key="cursor.id"
      :x="cursor.x"
      :y="cursor.y"
      :name="cursor.name"
      :color="cursor.color"
      :viewport="viewport"
    />
    <Toolbar
      :tool="tool"
      :color="color"
      :size="size"
      :connected="connected"
      :user-count="data.users.length"
      @update:tool="tool = $event"
      @update:color="color = $event"
      @update:size="size = $event"
      @clear="clearBoard"
      @copy-link="copyLink"
      @upload-image="addImageFromFile"
    />

    <div class="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 px-1 py-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200">
      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition text-lg leading-none"
        title="Zoom out"
        @click="zoomBy(1 / 1.2)"
      >−</button>
      <button
        type="button"
        class="px-2 h-8 min-w-[3rem] text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
        title="Reset view (100%, centered)"
        @click="resetView"
      >{{ zoomPercent }}%</button>
      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition text-lg leading-none"
        title="Zoom in"
        @click="zoomBy(1.2)"
      >+</button>
    </div>

    <div
      v-if="!connected"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-100 text-amber-800 text-sm rounded-full shadow"
    >
      Reconnecting…
    </div>
  </div>
</template>
