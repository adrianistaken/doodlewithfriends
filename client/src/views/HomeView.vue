<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '../composables/useSocket';

const router = useRouter();
const { socket } = useSocket();
const creating = ref(false);
const error = ref<string | null>(null);

function createRoom() {
  if (creating.value) return;
  creating.value = true;
  error.value = null;
  const timeout = setTimeout(() => {
    creating.value = false;
    error.value = 'Could not reach the server. Is it running?';
  }, 5000);
  socket.emit('room:create', ({ roomId }) => {
    clearTimeout(timeout);
    creating.value = false;
    router.push(`/room/${roomId}`);
  });
}
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center px-6 bg-gradient-to-br from-indigo-50 via-white to-pink-50">
    <h1 class="text-6xl sm:text-7xl font-black tracking-tight text-gray-900 text-center">
      Doodle<span class="text-indigo-500"> with friends</span>
    </h1>
    <p class="mt-3 text-lg text-gray-500 max-w-md text-center">
      Open a room, share the link, draw together.
    </p>
    <button
      type="button"
      class="mt-10 px-8 py-4 text-xl font-semibold text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
      :disabled="creating"
      @click="createRoom"
    >
      {{ creating ? 'Creating…' : 'Create a room' }}
    </button>
    <p v-if="error" class="mt-4 text-sm text-red-500">{{ error }}</p>
  </div>
</template>
