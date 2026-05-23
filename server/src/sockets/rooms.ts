import { nanoid } from 'nanoid';
import type { ImageObject, RoomState, RoomUser, Stroke } from '../types/shared.js';

const ROOM_ID_SIZE = 8;
const ROOM_INACTIVITY_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

const rooms = new Map<string, RoomState>();

export function createRoom(): RoomState {
  const id = nanoid(ROOM_ID_SIZE);
  const now = Date.now();
  const room: RoomState = {
    id,
    users: [],
    strokes: [],
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): RoomState | undefined {
  return rooms.get(id);
}

export function getOrCreate(id: string): RoomState {
  return rooms.get(id) ?? (() => {
    const now = Date.now();
    const room: RoomState = {
      id,
      users: [],
      strokes: [],
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    rooms.set(id, room);
    return room;
  })();
}

export function touch(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) room.updatedAt = Date.now();
}

export function addUser(roomId: string, user: RoomUser): RoomState {
  const room = getOrCreate(roomId);
  const idx = room.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) room.users[idx] = user;
  else room.users.push(user);
  room.updatedAt = Date.now();
  return room;
}

export function removeUserBySocket(socketId: string): { roomId: string; userId: string } | null {
  for (const room of rooms.values()) {
    const idx = room.users.findIndex((u) => u.socketId === socketId);
    if (idx >= 0) {
      const [removed] = room.users.splice(idx, 1);
      room.updatedAt = Date.now();
      return { roomId: room.id, userId: removed.id };
    }
  }
  return null;
}

export function addStroke(roomId: string, stroke: Stroke): void {
  const room = getOrCreate(roomId);
  if (!room.strokes.find((s) => s.id === stroke.id)) {
    room.strokes.push(stroke);
  }
  room.updatedAt = Date.now();
}

export function appendStrokePoints(roomId: string, strokeId: string, points: number[]): void {
  const room = rooms.get(roomId);
  if (!room) return;
  const s = room.strokes.find((s) => s.id === strokeId);
  if (s) {
    s.points = s.points.concat(points);
    room.updatedAt = Date.now();
  }
}

export function finalizeStroke(roomId: string, strokeId: string, finalPoints: number[]): void {
  const room = rooms.get(roomId);
  if (!room) return;
  const s = room.strokes.find((s) => s.id === strokeId);
  if (s) {
    s.points = finalPoints;
    room.updatedAt = Date.now();
  }
}

export function clearBoard(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.strokes = [];
  room.images = [];
  room.updatedAt = Date.now();
}

export function addImage(roomId: string, image: ImageObject): void {
  const room = getOrCreate(roomId);
  if (!room.images.find((i) => i.id === image.id)) {
    room.images.push(image);
  }
  room.updatedAt = Date.now();
}

export function startCleanupLoop(): NodeJS.Timeout {
  return setInterval(() => {
    const cutoff = Date.now() - ROOM_INACTIVITY_MS;
    for (const [id, room] of rooms) {
      if (room.users.length === 0 && room.updatedAt < cutoff) {
        rooms.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref();
}
