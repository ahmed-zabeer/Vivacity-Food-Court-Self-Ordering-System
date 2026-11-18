# Vivacity Food Court

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm

## Run locally

```sh
npm ci
npm run dev
```

The app and API are served together at `http://localhost:3000`. Phones cannot open
`localhost`, so the startup banner and the QR manager use the laptop's LAN address
(for example `http://192.168.0.197:3000/t/T17`). Keep both devices on the same Wi-Fi
and allow Node.js through the Windows firewall. To verify a clean checkout, run:

```sh
npm run typecheck
npm test
npm run build
```

For production on a persistent Node.js host, use `npm start`. The server writes
business data to `server/data`; keep that directory on persistent storage and
back it up.

## Deploy to Vercel

The app and the API deploy together. `vercel.json` builds the Vite SPA into `dist`,
serves every non-`/api` path through `index.html` (so deep links survive a refresh),
and routes `/api/*` to the serverless function in `api/`. The function runs the same
Express application as the local server (`server/app.js`), so ordering, payments,
KOTs and reports behave identically in both environments.

### 1. Add durable storage (required)

Serverless functions have a read-only, ephemeral filesystem. Orders are mirrored to
a Redis-compatible REST store and rehydrated on cold start. Set **either** pair of
environment variables in the Vercel project:

```text
KV_REST_API_URL=...        # or UPSTASH_REDIS_REST_URL
KV_REST_API_TOKEN=...      # or UPSTASH_REDIS_REST_TOKEN
```

Then open the admin panel → **Network / Storage** panel; it must report
`durable: true`. Without these variables the deployment can serve the menu but
cannot keep orders after a cold start.

### 2. Set the public URL

```text
APP_BASE_URL=https://your-app.vercel.app
VITE_PUBLIC_APP_URL=https://your-app.vercel.app
```

`APP_BASE_URL` is what QR codes point at. On Vercel the QR manager always uses the
deployed domain; on localhost it uses the laptop's LAN IP so phones can scan it.

### 3. Deploy and verify

```sh
vercel --prod
```

Check, in order:

1. `/api/network-info` returns JSON with `storage.durable: true`.
2. `/t/T17` opens the guest page for table T17 directly (and still does after a refresh).
3. Place a QR order, refresh – the order is still in the Central Counter list.
4. `/api/orders` still contains that order after ~10 minutes idle (a cold start).

Real-time updates use SSE on localhost/LAN and switch to polling `/api/sync/state`
on public domains, because serverless functions cannot hold a long-lived stream.
