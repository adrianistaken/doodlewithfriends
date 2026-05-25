<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Viewport } from '../lib/viewport';

const props = defineProps<{
  x: number;
  y: number;
  name: string;
  color: string;
  viewport: Viewport;
}>();

const displayX = ref(props.x);
const displayY = ref(props.y);

const SMOOTHING = 25;
const SNAP_DISTANCE = 600;

let rafId: number | null = null;
let lastTime: number | null = null;

watch(
  () => [props.x, props.y],
  ([nx, ny]) => {
    const dx = nx - displayX.value;
    const dy = ny - displayY.value;
    if (dx * dx + dy * dy > SNAP_DISTANCE * SNAP_DISTANCE) {
      displayX.value = nx;
      displayY.value = ny;
    }
  },
);

function tick(now: number) {
  const dt = lastTime === null ? 1 / 60 : (now - lastTime) / 1000;
  lastTime = now;
  const alpha = 1 - Math.exp(-SMOOTHING * dt);
  displayX.value += (props.x - displayX.value) * alpha;
  displayY.value += (props.y - displayY.value) * alpha;
  rafId = requestAnimationFrame(tick);
}

const screen = computed(() => ({
  x: displayX.value * props.viewport.scale + props.viewport.x,
  y: displayY.value * props.viewport.scale + props.viewport.y,
}));

onMounted(() => {
  rafId = requestAnimationFrame(tick);
});
onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
  <div
    class="pointer-events-none absolute z-20"
    :style="{ transform: `translate(${screen.x}px, ${screen.y}px)` }"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 2 L17 9 L10 11 L8 18 Z"
        :fill="color"
        stroke="white"
        stroke-width="1.2"
        stroke-linejoin="round"
      />
    </svg>
    <span
      class="ml-3 -mt-1 inline-block px-1.5 py-0.5 text-[10px] font-medium text-white rounded shadow"
      :style="{ backgroundColor: color }"
    >{{ name }}</span>
  </div>
</template>
