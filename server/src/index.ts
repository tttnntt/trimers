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

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!dbReady) return res.status(503).json({ error: 'Server initializing, try again in a moment' });
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/push', pushRouter);

let dbReady = false;
app.get('/api/health', (_, res) => {
  if (dbReady) return res.json({ ok: true });
  res.status(503).json({ ok: false, status: 'initializing' });
});

app.listen(PORT, () => {
  console.log(`Trimers API listening on port ${PORT}`);
  initDb()
    .then(() => {
      dbReady = true;
      console.log('Database ready');
    })
    .catch(err => {
      console.error('Failed to init DB:', err);
    });
});
