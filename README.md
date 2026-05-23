# Doodle With Friends

Real-time collaborative drawing. Open a room, share the link, draw together.

## Quick start

Two terminals.

**Server** (Node + Express + Socket.IO):

```bash
cd server
cp .env.example .env
npm install
npm run dev
# listens on http://localhost:3001
```

**Client** (Vue 3 + Vite + Konva):

```bash
cd client
cp .env.example .env
npm install
npm run dev
# open http://localhost:5173
```

Click **Create a room**, copy the link, open it in another browser window. Draw together.

## Project layout

```
/client            Vue 3 + Vite + TypeScript + Tailwind + vue-konva
  src/
    components/    DrawingCanvas, Toolbar, RemoteCursor
    composables/   useSocket, useRoom, useDrawing
    views/         HomeView, RoomView
    lib/           identity, colors, throttle
    types/         shared
/server            Node + Express + Socket.IO + TypeScript
  src/
    index.ts       HTTP + Socket.IO bootstrap
    sockets/       connection handler + in-memory room store
    lib/           zod schemas for event validation
    types/         shared
```

## Notes

- **State** is in-memory on the server. Restart = empty rooms. Rooms with zero users and no activity for 24h are garbage-collected every 15 min.
- **Images** are sent base64 over the socket and capped at ~2MB per image. Designed to be swapped for object storage later.
- **Identity** is anonymous and persisted to `localStorage` (random name + color).

