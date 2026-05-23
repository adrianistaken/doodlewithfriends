<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { nanoid } from 'nanoid';
import DrawingCanvas from '../components/DrawingCanvas.vue';
import RemoteCursor from '../components/RemoteCursor.vue';
import Toolbar from '../components/Toolbar.vue';
import { useRoom } from '../composables/useRoom';
import { useSocket } from '../composables/useSocket';
import type { ImageObject, Tool } from '../types/shared';

const props = defineProps<{ roomId: string }>();

const { socket, connected } = useSocket();
const { me, data } = useRoom(props.roomId);

const tool = ref<Tool>('pen');
const color = ref('#111827');
const size = ref(4);

const remoteUsers = computed(() =>
  data.users.filter((u) => u.id !== me.id && u.cursor),
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
  const width = Math.round(dimensions.width * scale);
  const height = Math.round(dimensions.height * scale);
  const image: ImageObject = {
    id: nanoid(),
    userId: me.id,
    url: dataUrl,
    x: Math.max(0, Math.round(window.innerWidth / 2 - width / 2)),
    y: Math.max(0, Math.round(window.innerHeight / 2 - height / 2)),
    width,
    height,
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
  for (const item of items) {
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
      :socket="socket"
      :room-id="roomId"
      :me="me"
      :users="data.users"
      :strokes="data.strokes"
      :images="data.images"
      :tool="tool"
      :color="color"
      :size="size"
    />
    <RemoteCursor
      v-for="user in remoteUsers"
      :key="user.id"
      :x="user.cursor!.x"
      :y="user.cursor!.y"
      :name="user.name"
      :color="user.color"
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
    <div
      v-if="!connected"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-100 text-amber-800 text-sm rounded-full shadow"
    >
      Reconnecting…
    </div>
  </div>
</template>
