import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { getOrCreateIdentity } from '../lib/identity';
import { useSocket } from './useSocket';
import type {
  ImageObject,
  RoomState,
  RoomUser,
  Stroke,
} from '../types/shared';

type RoomData = {
  users: RoomUser[];
  strokes: Stroke[];
  images: ImageObject[];
};

export function useRoom(roomId: string) {
  const { socket, connected } = useSocket();
  const me = getOrCreateIdentity();
  const data = reactive<RoomData>({ users: [], strokes: [], images: [] });
  const joined = ref(false);

  const sendJoin = () => {
    socket.emit('room:join', { roomId, user: me }, () => {
      joined.value = true;
    });
  };

  const onState = (state: RoomState) => {
    data.users = state.users;
    data.strokes = state.strokes;
    data.images = state.images;
  };
  const onUserJoined = ({ user }: { user: RoomUser }) => {
    if (!data.users.find((u) => u.id === user.id)) data.users.push(user);
  };
  const onUserLeft = ({ userId }: { userId: string }) => {
    data.users = data.users.filter((u) => u.id !== userId);
  };
  const onCursor = (payload: { userId: string; x: number; y: number }) => {
    const u = data.users.find((u) => u.id === payload.userId);
    if (u) u.cursor = { x: payload.x, y: payload.y };
  };
  const onStrokeStart = ({ stroke }: { stroke: Stroke }) => {
    if (stroke.userId === me.id) return;
    if (!data.strokes.find((s) => s.id === stroke.id)) data.strokes.push(stroke);
  };
  const onStrokeUpdate = ({ strokeId, points }: { strokeId: string; points: number[] }) => {
    const s = data.strokes.find((s) => s.id === strokeId);
    if (s && s.userId !== me.id) s.points = s.points.concat(points);
  };
  const onStrokeEnd = ({ strokeId, finalPoints }: { strokeId: string; finalPoints: number[] }) => {
    const s = data.strokes.find((s) => s.id === strokeId);
    if (s && s.userId !== me.id) s.points = finalPoints;
  };
  const onBoardClear = () => {
    data.strokes = [];
    data.images = [];
  };
  const onImageAdd = ({ image }: { image: ImageObject }) => {
    if (!data.images.find((i) => i.id === image.id)) data.images.push(image);
  };
  const onImageMove = ({ imageId, x, y }: { imageId: string; x: number; y: number }) => {
    const img = data.images.find((i) => i.id === imageId);
    if (img) {
      img.x = x;
      img.y = y;
    }
  };

  onMounted(() => {
    socket.on('room:state', onState);
    socket.on('room:user-joined', onUserJoined);
    socket.on('room:user-left', onUserLeft);
    socket.on('cursor:move', onCursor);
    socket.on('stroke:start', onStrokeStart);
    socket.on('stroke:update', onStrokeUpdate);
    socket.on('stroke:end', onStrokeEnd);
    socket.on('board:clear', onBoardClear);
    socket.on('image:add', onImageAdd);
    socket.on('image:move', onImageMove);
    socket.on('connect', sendJoin);
    if (socket.connected) sendJoin();
  });

  onBeforeUnmount(() => {
    socket.off('room:state', onState);
    socket.off('room:user-joined', onUserJoined);
    socket.off('room:user-left', onUserLeft);
    socket.off('cursor:move', onCursor);
    socket.off('stroke:start', onStrokeStart);
    socket.off('stroke:update', onStrokeUpdate);
    socket.off('stroke:end', onStrokeEnd);
    socket.off('board:clear', onBoardClear);
    socket.off('image:add', onImageAdd);
    socket.off('image:move', onImageMove);
    socket.off('connect', sendJoin);
  });

  return { me, data, joined, connected };
}
