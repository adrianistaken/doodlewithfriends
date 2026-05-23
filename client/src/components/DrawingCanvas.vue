<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { createDrawingController } from '../composables/useDrawing';
import { throttle } from '../lib/throttle';
import type { TypedSocket } from '../composables/useSocket';
import type { ClientUser, ImageObject, RoomUser, Stroke, Tool } from '../types/shared';

const props = defineProps<{
  socket: TypedSocket;
  roomId: string;
  me: ClientUser;
  users: RoomUser[];
  strokes: Stroke[];
  images: ImageObject[];
  tool: Tool;
  color: string;
  size: number;
}>();

const { width, height } = useWindowSize();

const stageRef = ref<{ getNode: () => import('konva').default.Stage } | null>(null);

const controller = createDrawingController({
  socket: props.socket,
  roomId: props.roomId,
  me: props.me,
  getTool: () => props.tool,
  getColor: () => props.color,
  getSize: () => props.size,
  pushStroke: (stroke) => {
    props.strokes.push(stroke);
  },
  appendPoints: (id, pts) => {
    const s = props.strokes.find((s) => s.id === id);
    if (s) s.points = s.points.concat(pts);
  },
  finalizeStroke: (id, pts) => {
    const s = props.strokes.find((s) => s.id === id);
    if (s) s.points = pts;
  },
  getStrokePoints: (id) => props.strokes.find((s) => s.id === id)?.points,
});

function stagePointer(): { x: number; y: number } | null {
  const stage = stageRef.value?.getNode();
  if (!stage) return null;
  const pos = stage.getPointerPosition();
  return pos ? { x: pos.x, y: pos.y } : null;
}

function onPointerDown() {
  const p = stagePointer();
  if (!p) return;
  controller.start(p.x, p.y);
}

const emitCursor = throttle((x: number, y: number) => {
  props.socket.emit('cursor:move', {
    roomId: props.roomId,
    userId: props.me.id,
    x,
    y,
  });
}, 50);

function onPointerMove() {
  const p = stagePointer();
  if (!p) return;
  controller.move(p.x, p.y);
  emitCursor(p.x, p.y);
}

function onPointerUp() {
  controller.end();
}

// Load HTMLImageElement instances for each ImageObject so Konva can render them.
const imageElements = ref(new Map<string, HTMLImageElement>());

function ensureImage(image: ImageObject) {
  if (imageElements.value.has(image.id)) return;
  const img = new Image();
  img.onload = () => {
    imageElements.value.set(image.id, img);
    // trigger reactivity
    imageElements.value = new Map(imageElements.value);
  };
  img.src = image.url;
}

const visibleImages = computed(() => {
  for (const img of props.images) ensureImage(img);
  return props.images
    .map((img) => ({ img, el: imageElements.value.get(img.id) }))
    .filter((x) => x.el !== undefined);
});

// Suppress browser default touch behavior while drawing on the canvas wrapper.
const wrapperRef = ref<HTMLDivElement | null>(null);
const prevent = (e: Event) => e.preventDefault();
onMounted(() => {
  wrapperRef.value?.addEventListener('touchstart', prevent, { passive: false });
  wrapperRef.value?.addEventListener('touchmove', prevent, { passive: false });
});
onBeforeUnmount(() => {
  wrapperRef.value?.removeEventListener('touchstart', prevent);
  wrapperRef.value?.removeEventListener('touchmove', prevent);
});
</script>

<template>
  <div ref="wrapperRef" class="absolute inset-0">
    <v-stage
      ref="stageRef"
      :config="{ width, height }"
      @mousedown="onPointerDown"
      @mousemove="onPointerMove"
      @mouseup="onPointerUp"
      @mouseleave="onPointerUp"
      @touchstart="onPointerDown"
      @touchmove="onPointerMove"
      @touchend="onPointerUp"
    >
      <v-layer>
        <v-image
          v-for="{ img, el } in visibleImages"
          :key="img.id"
          :config="{ image: el, x: img.x, y: img.y, width: img.width, height: img.height }"
        />
      </v-layer>
      <v-layer>
        <v-line
          v-for="stroke in strokes"
          :key="stroke.id"
          :config="{
            points: stroke.points,
            stroke: stroke.color,
            strokeWidth: stroke.size,
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.4,
            globalCompositeOperation: stroke.tool === 'eraser' ? 'destination-out' : 'source-over',
          }"
        />
      </v-layer>
    </v-stage>
  </div>
</template>
