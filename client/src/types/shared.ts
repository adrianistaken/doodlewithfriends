export type Tool = 'pen' | 'eraser' | 'hand';

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

export type RoomJoinPayload = {
  roomId: string;
  user: ClientUser;
};

export type CursorMovePayload = {
  roomId: string;
  userId: string;
  x: number;
  y: number;
};

export type StrokeStartPayload = {
  roomId: string;
  stroke: Stroke;
};

export type StrokeUpdatePayload = {
  roomId: string;
  strokeId: string;
  points: number[];
};

export type StrokeEndPayload = {
  roomId: string;
  strokeId: string;
  finalPoints: number[];
};

export type BoardClearPayload = {
  roomId: string;
  userId: string;
};

export type ImageAddPayload = {
  roomId: string;
  image: ImageObject;
};

export type UserJoinedPayload = { user: RoomUser };
export type UserLeftPayload = { userId: string };

export type ServerToClientEvents = {
  'room:state': (state: RoomState) => void;
  'room:user-joined': (payload: UserJoinedPayload) => void;
  'room:user-left': (payload: UserLeftPayload) => void;
  'cursor:move': (payload: CursorMovePayload) => void;
  'stroke:start': (payload: StrokeStartPayload) => void;
  'stroke:update': (payload: StrokeUpdatePayload) => void;
  'stroke:end': (payload: StrokeEndPayload) => void;
  'board:clear': (payload: BoardClearPayload) => void;
  'image:add': (payload: ImageAddPayload) => void;
};

export type ClientToServerEvents = {
  'room:create': (ack: (response: { roomId: string }) => void) => void;
  'room:join': (payload: RoomJoinPayload, ack?: (response: { ok: boolean }) => void) => void;
  'cursor:move': (payload: CursorMovePayload) => void;
  'stroke:start': (payload: StrokeStartPayload) => void;
  'stroke:update': (payload: StrokeUpdatePayload) => void;
  'stroke:end': (payload: StrokeEndPayload) => void;
  'board:clear': (payload: BoardClearPayload) => void;
  'image:add': (payload: ImageAddPayload) => void;
};
