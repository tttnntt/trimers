# Trimers

Trimers is a progressive web app for sharing photo albums inside private group chats. Each album round lets every member of a group submit a 3–10 photo album within 48 hours, then react with star votes. Albums remain permanently visible in the group bio.

The app is split into:

- **client**: React + Vite PWA frontend
- **server**: Node.js + Express + SQLite backend with S3-compatible object storage and Web Push notifications

## Local development

1. **Install Node.js** (18+ recommended).
2. From the project root, install dependencies:

   ```bash
   cd "c:\\Users\\bejay\\Desktop\\cursor trimers"
   cd server && npm install
   cd ../client && npm install
   ```

3. **Configure environment variables** in `server/.env` (see `DEPLOYMENT.md` for details).
4. Run the backend:

   ```bash
   cd server
   npm run dev
   ```

5. In another terminal, run the frontend:

   ```bash
   cd client
   npm run dev
   ```

6. Open `https://trimers-dot-com.onrender.com` in your browser. The React app mounts into the `<div id="root">` element and behaves as a PWA (installable, offline-capable, and with push notification support where configured).

## Production build

- **Frontend build**:

  ```bash
  cd client
  npm run build
  ```

  This outputs a static bundle in `client/dist` that you can deploy to any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.).

- **Backend build**:

  ```bash
  cd server
  npm run build
  ```

  This compiles TypeScript into `server/dist`. Start the API with:

  ```bash
  node dist/index.js
  ```

## Deployment overview

- **Backend**: Deploy `server` as a Node service on a cloud provider (Render, Railway, Fly.io, or similar). Point environment variables as described in `DEPLOYMENT.md`.
- **Frontend**: Deploy `client/dist` to a static host (e.g. Vercel or Netlify) and configure a proxy or environment variable so the frontend talks to your backend’s `/api` base URL.

See `DEPLOYMENT.md` in the project root for a step-by-step deployment guide.

