import { io, Socket } from 'socket.io-client';
import { ref } from 'vue';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
const connected = ref(false);

export function useSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socket.on('connect', () => {
      connected.value = true;
    });
    socket.on('disconnect', () => {
      connected.value = false;
    });
  }
  return { socket, connected };
}
