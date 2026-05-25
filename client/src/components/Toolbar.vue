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
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:tool', value: Tool): void;
  (e: 'update:color', value: string): void;
  (e: 'update:size', value: number): void;
  (e: 'clear'): void;
  (e: 'copy-link'): void;
  (e: 'upload-image', file: File): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
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
      class="w-9 h-9 flex items-center justify-center rounded-lg transition"
      :class="tool === 'hand' ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'"
      title="Hand (pan)"
      @click="emit('update:tool', 'hand')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 11V6a2 2 0 1 0-4 0v5" />
        <path d="M14 10V4a2 2 0 1 0-4 0v6" />
        <path d="M10 10.5V6a2 2 0 1 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    </button>
    <button
      type="button"
      class="w-9 h-9 flex items-center justify-center rounded-lg transition"
      :class="tool === 'pen' ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'"
      title="Pen"
      @click="emit('update:tool', 'pen')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </button>
    <button
      type="button"
      class="w-9 h-9 flex items-center justify-center rounded-lg transition"
      :class="tool === 'eraser' ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'"
      title="Eraser"
      @click="emit('update:tool', 'eraser')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    </button>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <button
      type="button"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      title="Undo (⌘Z)"
      :disabled="!canUndo"
      @click="emit('undo')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
      </svg>
    </button>
    <button
      type="button"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      title="Redo (⌘⇧Z)"
      :disabled="!canRedo"
      @click="emit('redo')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
      </svg>
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
