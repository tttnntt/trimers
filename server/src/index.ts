import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { groupsRouter } from './routes/groups.js';
import { albumsRouter } from './routes/albums.js';
import { pushRouter } from './routes/push.js';
import { initDb } from './db/init.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' }
}));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/push', pushRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Trimers API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
