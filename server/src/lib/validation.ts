import { z } from 'zod';

export const clientUserSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const roomJoinSchema = z.object({
  roomId: z.string().min(1).max(32),
  user: clientUserSchema,
});

export const cursorMoveSchema = z.object({
  roomId: z.string().min(1).max(32),
  userId: z.string().min(1).max(64),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const strokeSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  points: z.array(z.number().finite()).max(20000),
  color: z.string().regex(/^#[0-9a-fA-F]{6,8}$/),
  size: z.number().min(0.5).max(200),
  tool: z.enum(['pen', 'eraser']),
  createdAt: z.number(),
});

export const strokeStartSchema = z.object({
  roomId: z.string().min(1).max(32),
  stroke: strokeSchema,
});

export const strokeUpdateSchema = z.object({
  roomId: z.string().min(1).max(32),
  strokeId: z.string().min(1).max(64),
  points: z.array(z.number().finite()).max(2000),
});

export const strokeEndSchema = z.object({
  roomId: z.string().min(1).max(32),
  strokeId: z.string().min(1).max(64),
  finalPoints: z.array(z.number().finite()).max(20000),
});

export const boardClearSchema = z.object({
  roomId: z.string().min(1).max(32),
  userId: z.string().min(1).max(64),
});

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_URL_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100;

export const imageObjectSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.string().min(1).max(64),
  url: z.string().max(MAX_IMAGE_URL_LENGTH),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive().max(8000),
  height: z.number().positive().max(8000),
  createdAt: z.number(),
});

export const imageAddSchema = z.object({
  roomId: z.string().min(1).max(32),
  image: imageObjectSchema,
});
