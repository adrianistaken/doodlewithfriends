import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import {
  addImage,
  addStroke,
  addUser,
  appendStrokePoints,
  clearBoard,
  createRoom,
  finalizeStroke,
  getRoom,
  moveImage,
  removeUserBySocket,
  startCleanupLoop,
} from './rooms.js';
import {
  boardClearSchema,
  cursorMoveSchema,
  imageAddSchema,
  imageMoveSchema,
  roomJoinSchema,
  strokeEndSchema,
  strokeStartSchema,
  strokeUpdateSchema,
} from '../lib/validation.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/shared.js';

export function attachSocketIo(httpServer: HttpServer, corsOrigin: string) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 4 * 1024 * 1024,
  });

  startCleanupLoop();

  io.on('connection', (socket) => {
    socket.on('room:create', (ack) => {
      const room = createRoom();
      if (typeof ack === 'function') ack({ roomId: room.id });
    });

    socket.on('room:join', (raw, ack) => {
      const parsed = roomJoinSchema.safeParse(raw);
      if (!parsed.success) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }
      const { roomId, user } = parsed.data;
      const room = addUser(roomId, { ...user, socketId: socket.id });
      socket.data.userId = user.id;
      socket.data.roomId = roomId;
      socket.join(roomId);
      socket.emit('room:state', room);
      socket.to(roomId).emit('room:user-joined', {
        user: { ...user, socketId: socket.id },
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('cursor:move', (raw) => {
      const parsed = cursorMoveSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      socket.to(roomId).emit('cursor:move', parsed.data);
    });

    socket.on('stroke:start', (raw) => {
      const parsed = strokeStartSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId, stroke } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      addStroke(roomId, stroke);
      socket.to(roomId).emit('stroke:start', parsed.data);
    });

    socket.on('stroke:update', (raw) => {
      const parsed = strokeUpdateSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId, strokeId, points } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      appendStrokePoints(roomId, strokeId, points);
      socket.to(roomId).emit('stroke:update', parsed.data);
    });

    socket.on('stroke:end', (raw) => {
      const parsed = strokeEndSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId, strokeId, finalPoints } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      finalizeStroke(roomId, strokeId, finalPoints);
      socket.to(roomId).emit('stroke:end', parsed.data);
    });

    socket.on('board:clear', (raw) => {
      const parsed = boardClearSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      clearBoard(roomId);
      io.to(roomId).emit('board:clear', parsed.data);
    });

    socket.on('image:add', (raw) => {
      const parsed = imageAddSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId, image } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      if (!getRoom(roomId)) return;
      addImage(roomId, image);
      socket.to(roomId).emit('image:add', parsed.data);
    });

    socket.on('image:move', (raw) => {
      const parsed = imageMoveSchema.safeParse(raw);
      if (!parsed.success) return;
      const { roomId, imageId, x, y } = parsed.data;
      if (socket.data.roomId !== roomId) return;
      moveImage(roomId, imageId, x, y);
      socket.to(roomId).emit('image:move', parsed.data);
    });

    socket.on('disconnect', () => {
      const removed = removeUserBySocket(socket.id);
      if (removed) {
        io.to(removed.roomId).emit('room:user-left', { userId: removed.userId });
      }
    });
  });

  return io;
}
