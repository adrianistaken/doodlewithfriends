<script setup lang="ts">
import { ref } from 'vue';
import { PEN_PALETTE } from '../lib/colors';
import type { Tool } from '../types/shared';

const props = defineProps<{
  tool: Tool;
  color: string;
  size: number;
  connected: boolean;
  userCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:tool', value: Tool): void;
  (e: 'update:color', value: string): void;
  (e: 'update:size', value: number): void;
  (e: 'clear'): void;
  (e: 'copy-link'): void;
  (e: 'upload-image', file: File): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const colorOpen = ref(false);
const copied = ref(false);

function pickColor(c: string) {
  emit('update:color', c);
  colorOpen.value = false;
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('upload-image', file);
  input.value = '';
}

function copyLink() {
  emit('copy-link');
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

function clear() {
  if (confirm('Clear the board for everyone?')) emit('clear');
}

defineExpose({});
void props;
</script>

<template>
  <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-2 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-gray-200">
    <button
      type="button"
      class="px-3 py-2 rounded-lg text-sm font-medium transition"
      :class="tool === 'pen' ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'"
      @click="emit('update:tool', 'pen')"
    >
      Pen
    </button>
    <button
      type="button"
      class="px-3 py-2 rounded-lg text-sm font-medium transition"
      :class="tool === 'eraser' ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'"
      @click="emit('update:tool', 'eraser')"
    >
      Eraser
    </button>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <div class="relative">
      <button
        type="button"
        class="w-9 h-9 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition flex items-center justify-center"
        :style="{ backgroundColor: color }"
        :title="`Color: ${color}`"
        @click="colorOpen = !colorOpen"
      />
      <div
        v-if="colorOpen"
        class="absolute top-12 left-0 p-2 bg-white rounded-xl shadow-xl border border-gray-200 grid grid-cols-3 gap-1.5 w-32"
      >
        <button
          v-for="c in PEN_PALETTE"
          :key="c"
          type="button"
          class="w-8 h-8 rounded-md border border-gray-200 hover:scale-110 transition"
          :style="{ backgroundColor: c }"
          @click="pickColor(c)"
        />
        <label class="w-8 h-8 rounded-md border border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-xs text-gray-500 hover:bg-gray-50">
          ⋯
          <input
            type="color"
            class="sr-only"
            :value="color"
            @input="(e) => emit('update:color', (e.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="flex items-center gap-2 px-2">
      <input
        type="range"
        min="1"
        max="40"
        :value="size"
        @input="(e) => emit('update:size', Number((e.target as HTMLInputElement).value))"
        class="w-24 accent-indigo-500"
      />
      <span class="text-xs text-gray-500 w-6 text-right">{{ size }}</span>
    </div>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <button
      type="button"
      class="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
      @click="fileInput?.click()"
    >
      Image
    </button>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />

    <button
      type="button"
      class="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
      @click="clear"
    >
      Clear
    </button>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <button
      type="button"
      class="px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition whitespace-nowrap"
      @click="copyLink"
    >
      {{ copied ? 'Copied!' : 'Copy link' }}
    </button>

    <div class="flex items-center gap-1.5 pl-3 pr-1 text-xs text-gray-500">
      <span
        class="w-2 h-2 rounded-full"
        :class="connected ? 'bg-green-500' : 'bg-gray-300'"
      />
      <span>{{ userCount }}</span>
    </div>
  </div>
</template>
