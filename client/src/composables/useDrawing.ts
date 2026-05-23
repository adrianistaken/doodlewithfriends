import { nanoid } from 'nanoid';
import type { TypedSocket } from './useSocket';
import type { ClientUser, Stroke, Tool } from '../types/shared';

const FLUSH_INTERVAL_MS = 16;
const MIN_POINT_DISTANCE = 2;

export type DrawingDeps = {
  socket: TypedSocket;
  roomId: string;
  me: ClientUser;
  getTool: () => Tool;
  getColor: () => string;
  getSize: () => number;
  pushStroke: (stroke: Stroke) => void;
  appendPoints: (strokeId: string, points: number[]) => void;
  finalizeStroke: (strokeId: string, points: number[]) => void;
  getStrokePoints: (strokeId: string) => number[] | undefined;
};

export function createDrawingController(deps: DrawingDeps) {
  let active: Stroke | null = null;
  let buffer: number[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let lastX = 0;
  let lastY = 0;

  const flush = () => {
    if (!active || buffer.length === 0) return;
    const points = buffer;
    buffer = [];
    deps.socket.emit('stroke:update', {
      roomId: deps.roomId,
      strokeId: active.id,
      points,
    });
  };

  const start = (x: number, y: number) => {
    const stroke: Stroke = {
      id: nanoid(),
      userId: deps.me.id,
      points: [x, y],
      color: deps.getColor(),
      size: deps.getSize(),
      tool: deps.getTool(),
      createdAt: Date.now(),
    };
    active = stroke;
    buffer = [];
    lastX = x;
    lastY = y;
    deps.pushStroke(stroke);
    deps.socket.emit('stroke:start', { roomId: deps.roomId, stroke });
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  };

  const move = (x: number, y: number) => {
    if (!active) return;
    const dx = x - lastX;
    const dy = y - lastY;
    if (dx * dx + dy * dy < MIN_POINT_DISTANCE * MIN_POINT_DISTANCE) return;
    lastX = x;
    lastY = y;
    deps.appendPoints(active.id, [x, y]);
    buffer.push(x, y);
  };

  const end = () => {
    if (!active) return;
    flush();
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    const stroke = active;
    active = null;
    const final = deps.getStrokePoints(stroke.id) ?? stroke.points;
    deps.socket.emit('stroke:end', {
      roomId: deps.roomId,
      strokeId: stroke.id,
      finalPoints: final,
    });
    deps.finalizeStroke(stroke.id, final);
  };

  return { start, move, end };
}
