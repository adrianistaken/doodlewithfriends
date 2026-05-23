export type Tool = 'pen' | 'eraser';

export type RoomUser = {
  id: string;
  socketId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
};

export type Stroke = {
  id: string;
  userId: string;
  points: number[];
  color: string;
  size: number;
  tool: Tool;
  createdAt: number;
};

export type ImageObject = {
  id: string;
  userId: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
};

export type RoomState = {
  id: string;
  users: RoomUser[];
  strokes: Stroke[];
  images: ImageObject[];
  createdAt: number;
  updatedAt: number;
};

export type ClientUser = {
  id: string;
  name: string;
  color: string;
};

export type ServerToClientEvents = {
  'room:state': (state: RoomState) => void;
  'room:user-joined': (payload: { user: RoomUser }) => void;
  'room:user-left': (payload: { userId: string }) => void;
  'cursor:move': (payload: { roomId: string; userId: string; x: number; y: number }) => void;
  'stroke:start': (payload: { roomId: string; stroke: Stroke }) => void;
  'stroke:update': (payload: { roomId: string; strokeId: string; points: number[] }) => void;
  'stroke:end': (payload: { roomId: string; strokeId: string; finalPoints: number[] }) => void;
  'board:clear': (payload: { roomId: string; userId: string }) => void;
  'image:add': (payload: { roomId: string; image: ImageObject }) => void;
};

export type ClientToServerEvents = {
  'room:create': (ack: (response: { roomId: string }) => void) => void;
  'room:join': (
    payload: { roomId: string; user: ClientUser },
    ack?: (response: { ok: boolean }) => void,
  ) => void;
  'cursor:move': (payload: { roomId: string; userId: string; x: number; y: number }) => void;
  'stroke:start': (payload: { roomId: string; stroke: Stroke }) => void;
  'stroke:update': (payload: { roomId: string; strokeId: string; points: number[] }) => void;
  'stroke:end': (payload: { roomId: string; strokeId: string; finalPoints: number[] }) => void;
  'board:clear': (payload: { roomId: string; userId: string }) => void;
  'image:add': (payload: { roomId: string; image: ImageObject }) => void;
};

export type InterServerEvents = Record<string, never>;
export type SocketData = { userId?: string; roomId?: string };
