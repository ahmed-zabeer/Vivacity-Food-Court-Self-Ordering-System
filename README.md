# Vivacity Food Court

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm

## Run locally

```sh
npm ci
npm run dev
```

The app and API are served together at `http://localhost:3000`. To verify a clean
checkout, run:

```sh
npm run typecheck
npm test
npm run build
```

For production on a persistent Node.js host, use `npm start`. The server writes
business data to `server/data`; keep that directory on persistent storage and
back it up.

## Deploy the frontend to Vercel

`vercel.json` configures the Vite single-page app build and client-side route
fallback. Set the project root to the repository root; the build command is
`npm run build` and the output directory is `dist`.

The Express API is **not** deployed by this static Vercel configuration. It
stores data in local JSON files and maintains real-time events in process memory;
Vercel's static output cannot provide that API or durable storage. Deploy the API
to a persistent Node.js host, then set the Vercel build environment variable
`VITE_API_BASE_URL` to the API's full base URL, including `/api` (for example,
`https://api.example.com/api`). Configure the backend's `CORS_ORIGINS` to include
the Vercel site origin. If the API URL is not configured, Vercel returns a clear
503 response for `/api/*` instead of serving the SPA HTML as a fake API result.
Do not use the Vercel frontend as a production ordering system until the API has
persistent shared storage and its real-time transport is hosted appropriately.
