import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { attachSocketIo } from './sockets/index.js';

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
attachSocketIo(httpServer, CORS_ORIGIN);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Doodle With Friends server listening on :${PORT} (cors: ${CORS_ORIGIN})`);
});
