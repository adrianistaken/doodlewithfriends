<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { createDrawingController } from '../composables/useDrawing';
import { throttle } from '../lib/throttle';
import {
  clampScale,
  defaultViewport,
  type Viewport,
} from '../lib/viewport';
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

const viewport = defineModel<Viewport>('viewport', { required: true });

const { width, height } = useWindowSize();

const stageRef = ref<{ getNode: () => import('konva').default.Stage } | null>(null);

function screenPointer(): { x: number; y: number } | null {
  const stage = stageRef.value?.getNode();
  if (!stage) return null;
  const pos = stage.getPointerPosition();
  return pos ? { x: pos.x, y: pos.y } : null;
}

function worldPointer(): { x: number; y: number } | null {
  const p = screenPointer();
  if (!p) return null;
  return {
    x: (p.x - viewport.value.x) / viewport.value.scale,
    y: (p.y - viewport.value.y) / viewport.value.scale,
  };
}

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

const emitCursor = throttle((x: number, y: number) => {
  props.socket.emit('cursor:move', {
    roomId: props.roomId,
    userId: props.me.id,
    x,
    y,
  });
}, 16);

// Only re-center on resize if the user hasn't manually moved the viewport yet.
let viewportTouched = false;

watch(
  [width, height],
  ([w, h]) => {
    if (w === 0 || h === 0) return;
    if (viewportTouched) return;
    viewport.value = defaultViewport(w, h);
  },
  { immediate: true },
);

const spaceDown = ref(false);

function onKeyDown(e: KeyboardEvent) {
  // Ignore when typing into inputs.
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  if (e.code === 'Space' && !e.repeat) {
    spaceDown.value = true;
    e.preventDefault();
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') spaceDown.value = false;
}

// Wheel-zoom around the cursor (also handles trackpad pinch which is reported as ctrlKey+wheel).
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const stage = stageRef.value?.getNode();
  if (!stage) return;
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  // ctrlKey set = pinch-zoom on trackpads; otherwise scroll-to-pan unless Cmd/Ctrl is held.
  const isZoom = e.ctrlKey || e.metaKey;
  if (isZoom) {
    const oldScale = viewport.value.scale;
    const factor = Math.exp(-e.deltaY * 0.01);
    const newScale = clampScale(oldScale * factor);
    if (newScale === oldScale) return;
    const wx = (pointer.x - viewport.value.x) / oldScale;
    const wy = (pointer.y - viewport.value.y) / oldScale;
    viewport.value = {
      scale: newScale,
      x: pointer.x - wx * newScale,
      y: pointer.y - wy * newScale,
    };
  } else {
    // Scroll = pan
    viewport.value = {
      ...viewport.value,
      x: viewport.value.x - e.deltaX,
      y: viewport.value.y - e.deltaY,
    };
  }
  viewportTouched = true;
}

// Pan state. Pan is triggered by: the hand tool, holding space, or middle-click.
const isPanning = ref(false);
const panStart = { screen: { x: 0, y: 0 }, viewport: { x: 0, y: 0 } };

type KonvaEvt = { evt: MouseEvent | TouchEvent };

function wantsPan(evt: MouseEvent | TouchEvent): boolean {
  if (props.tool === 'hand') return true;
  if (evt instanceof MouseEvent) {
    return evt.button === 1 || (evt.button === 0 && spaceDown.value);
  }
  return false;
}

function onPointerDown(e: KonvaEvt) {
  const evt = e.evt;
  // Multi-touch is handled by the wrapper's touch listeners.
  if (evt instanceof TouchEvent && evt.touches.length > 1) return;

  if (wantsPan(evt)) {
    const p = screenPointer();
    if (!p) return;
    isPanning.value = true;
    panStart.screen = p;
    panStart.viewport = { x: viewport.value.x, y: viewport.value.y };
    if (evt instanceof MouseEvent) evt.preventDefault();
    return;
  }
  const p = worldPointer();
  if (!p) return;
  controller.start(p.x, p.y);
}

function onPointerMove() {
  if (isPanning.value) {
    const p = screenPointer();
    if (!p) return;
    viewport.value = {
      ...viewport.value,
      x: panStart.viewport.x + (p.x - panStart.screen.x),
      y: panStart.viewport.y + (p.y - panStart.screen.y),
    };
    viewportTouched = true;
    return;
  }
  const p = worldPointer();
  if (!p) return;
  controller.move(p.x, p.y);
  emitCursor(p.x, p.y);
}

function onPointerUp() {
  if (isPanning.value) {
    isPanning.value = false;
    return;
  }
  controller.end();
}

function onMouseLeave() {
  isPanning.value = false;
  controller.end();
}

// Touch gestures: 1 finger draws, 2+ fingers pan + pinch-zoom.
type TouchMode = 'idle' | 'draw' | 'gesture';
let touchMode: TouchMode = 'idle';
let gestureStart: {
  mid: { x: number; y: number };
  dist: number;
  viewport: Viewport;
  rect: DOMRect;
} | null = null;

function touchMid(t1: Touch, t2: Touch, rect: DOMRect) {
  return {
    x: (t1.clientX + t2.clientX) / 2 - rect.left,
    y: (t1.clientY + t2.clientY) / 2 - rect.top,
  };
}
function touchDist(t1: Touch, t2: Touch) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    touchMode = 'draw';
    // Don't preventDefault — let Konva fire its mousedown via touch.
    return;
  }
  if (e.touches.length >= 2) {
    if (touchMode === 'draw') controller.end();
    touchMode = 'gesture';
    const rect = wrapperRef.value!.getBoundingClientRect();
    gestureStart = {
      mid: touchMid(e.touches[0], e.touches[1], rect),
      dist: touchDist(e.touches[0], e.touches[1]),
      viewport: { ...viewport.value },
      rect,
    };
    e.preventDefault();
  }
}

function onTouchMove(e: TouchEvent) {
  if (touchMode === 'gesture' && gestureStart && e.touches.length >= 2) {
    const mid = touchMid(e.touches[0], e.touches[1], gestureStart.rect);
    const dist = touchDist(e.touches[0], e.touches[1]);
    const newScale = clampScale(gestureStart.viewport.scale * (dist / gestureStart.dist));
    const wx = (gestureStart.mid.x - gestureStart.viewport.x) / gestureStart.viewport.scale;
    const wy = (gestureStart.mid.y - gestureStart.viewport.y) / gestureStart.viewport.scale;
    viewport.value = {
      scale: newScale,
      x: mid.x - wx * newScale,
      y: mid.y - wy * newScale,
    };
    viewportTouched = true;
    e.preventDefault();
  } else if (touchMode === 'draw') {
    // Prevent the browser from interpreting the touch as scroll/zoom.
    e.preventDefault();
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    touchMode = 'idle';
    gestureStart = null;
  }
  // If gesture drops to 1 finger, stay in gesture until fully released to avoid an accidental stroke.
}

const wrapperRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  wrapperRef.value?.addEventListener('touchstart', onTouchStart, { passive: false });
  wrapperRef.value?.addEventListener('touchmove', onTouchMove, { passive: false });
  wrapperRef.value?.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});
onBeforeUnmount(() => {
  wrapperRef.value?.removeEventListener('touchstart', onTouchStart);
  wrapperRef.value?.removeEventListener('touchmove', onTouchMove);
  wrapperRef.value?.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

// Load HTMLImageElement instances for each ImageObject so Konva can render them.
const imageElements = ref(new Map<string, HTMLImageElement>());

function ensureImage(image: ImageObject) {
  if (imageElements.value.has(image.id)) return;
  const img = new Image();
  img.onload = () => {
    imageElements.value.set(image.id, img);
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

const cursorClass = computed(() => {
  if (isPanning.value) return 'cursor-grabbing';
  if (props.tool === 'hand' || spaceDown.value) return 'cursor-grab';
  return '';
});

</script>

<template>
  <div ref="wrapperRef" :class="['absolute inset-0 bg-white', cursorClass]" @wheel.prevent="onWheel">
    <v-stage
      ref="stageRef"
      :config="{
        width,
        height,
        scaleX: viewport.scale,
        scaleY: viewport.scale,
        x: viewport.x,
        y: viewport.y,
      }"
      @mousedown="onPointerDown"
      @mousemove="onPointerMove"
      @mouseup="onPointerUp"
      @mouseleave="onMouseLeave"
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
