## Trimers deployment guide (backend + frontend)

This guide shows one concrete way to put Trimers online:

- Backend API on **Render** (Node web service)
- Frontend PWA on **Vercel** (static build of the React app)

You can adapt the same steps to Railway, Fly.io, Netlify, etc.

---

## 1. Backend (server) deployment

### 1.1. Prepare the server build

From the `server` folder:

```bash
cd server
npm install
npm run build
```

Verify it runs locally:

```bash
node dist/index.js
```

You should see “Trimers API running on port 3001” and be able to hit `http://localhost:3001/api/health`.

### 1.2. Required environment variables

Create a `.env` file locally (do **not** commit secrets) with something like:

```bash
PORT=3001
DATABASE_PATH=./data/trimers.db

# JWT
JWT_SECRET=change-me-to-a-long-random-string

# S3-compatible object storage (Backblaze, DigitalOcean Spaces, AWS S3, etc.)
S3_BUCKET=your-trimers-bucket
S3_REGION=your-region
S3_ENDPOINT=https://your-s3-endpoint          # optional for AWS; required for most S3-compatible hosts
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://public.cdn.for.your.bucket  # optional; used for direct public URLs

# Web Push VAPID keys
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
```

To generate VAPID keys, add a small helper script in `server/scripts/generate-vapid-keys.js`:

```js
// server/scripts/generate-vapid-keys.js
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log(keys);
```

Then run:

```bash
cd server
npx web-push generate-vapid-keys
```

Copy the `publicKey` and `privateKey` into `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

### 1.3. Deploy to Render (example)

1. Push this project to a Git repository (GitHub, GitLab, etc.).
2. In the Render dashboard, create a **new Web Service**:
   - **Repository**: select your Trimers repo
   - **Root directory**: `server`
   - **Environment**: Node
   - **Build command**: `npm install && npm run build`
   - **Start command**: `node dist/index.js`
3. In Render’s **Environment** tab, add all variables from your `.env` (PORT, DATABASE_PATH, S3_*, JWT_SECRET, VAPID_*).
4. Deploy. When it’s live, you’ll get a URL like:

   ```text
   https://trimers-api.onrender.com
   ```

Confirm `/api/health` responds OK:

```bash
curl https://trimers-api.onrender.com/api/health
```

If you prefer another provider (Railway, Fly.io, etc.), use the same build + start commands and the same environment variables.

---

## 2. Frontend (client) deployment

### 2.1. Configure API base URL (if needed)

By default, the Vite dev server proxies `/api` to `http://localhost:3001`.  
In production, you want `/api` to point at your deployed backend, e.g. `https://trimers-api.onrender.com`.

Simplest option on Vercel/Netlify:

- Deploy **frontend and backend under the same domain** (e.g. API as `/api` via a rewrite/proxy), **or**
- Configure a `VITE_API_BASE_URL` env variable for the client and use it inside `client/src/api/client.ts`.

Example change in `client/src/api/client.ts` (already close to this pattern):

```ts
const API = import.meta.env.VITE_API_BASE_URL || '/api';
```

Then set `VITE_API_BASE_URL=https://trimers-api.onrender.com/api` in Vercel’s env settings.

### 2.2. Build the PWA

From the `client` folder:

```bash
cd client
npm install
npm run build
```

This creates a production build in `client/dist`. It already includes:

- A service worker and offline caching (via `vite-plugin-pwa`)
- PWA manifest with Trimers name, icons, and dark green theme

### 2.3. Deploy to Vercel (example)

1. In Vercel, create a **New Project** and select your repo.
2. Project settings:
   - **Framework preset**: Vite
   - **Root directory**: `client`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Add environment variables:
   - `VITE_API_BASE_URL=https://trimers-api.onrender.com/api` (replace with your actual backend URL)
4. Deploy. The app will be available at something like `https://trimers.vercel.app`.

On first load, the browser will prompt to:

- **Install** the Trimers PWA (Add to Home Screen on mobile)
- **Allow notifications** (for Web Push, once you wire `usePushNotifications` in the UI and have VAPID keys set)

---

## 3. Verifying everything works

1. Open the deployed frontend URL in a desktop and mobile browser.
2. Sign up with an email + password, complete profile setup, and create a group.
3. Start an album round and upload an album (3–10 photos).
4. Check that:
   - Images upload and render crisply (100% quality after server-side compression)
   - Group bio shows past rounds and albums
   - Unauthorized users cannot view group content (API returns 401/403)
5. Turn on **Lighthouse** (Chrome DevTools) to verify:
   - PWA installability
   - Offline capability for basic navigation

Once these checks pass, your Trimers instance is live and ready to share.

