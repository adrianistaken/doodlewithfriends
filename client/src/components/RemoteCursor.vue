<script setup lang="ts">
defineProps<{
  x: number;
  y: number;
  name: string;
  color: string;
}>();
</script>

<template>
  <div
    class="pointer-events-none absolute z-20"
    :style="{ transform: `translate(${x}px, ${y}px)` }"
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
