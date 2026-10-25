# DiscoHookTube (Open Source Edition)

A lightweight, serverless YouTube-to-Discord notification engine built for Cloudflare Workers. It uses native Discord Webhooks with custom embeds, live-stream priority detection, and anti-spam filters—eliminating the need for third-party bots or complex hosting.

> **Set-and-Forget Architecture**: Deploy once in under 2 minutes, let Cloudflare handle scheduled cron triggers for free, and never worry about server maintenance or bot downtime again.

---

> [!WARNING]
> **SECURITY NOTICE FOR PUBLIC FORKS**  
> If you fork this repository publicly, **never commit sensitive credentials** (such as Discord Webhook URLs or passwords) directly to your files. Keep your fork **Private**, or set sensitive values inside Cloudflare's **Settings > Variables and Secrets** panel.

---

## Features

- **Bot-Free Operations**: Runs natively via official Discord Webhooks.
- **Accurate Live Detection**: Prioritizes YouTube's `/live` state to avoid false alerts on scheduled broadcasts.
- **Set & Forget**: Edge cache handles deduplication automatically with zero database required in default mode.
- **Two Flexible Modes**:
  - `worker_only` (Default): Pure headless background worker. Reads channels from `config.js` and runs on a cron interval.
  - `standalone_ui`: Minimalist web panel powered by Cloudflare D1 to manage channels on the fly.
- **Content Filtering**: Option to filter out YouTube Shorts, live-only alerts, or upload-only alerts.

---

## Deployment (Hit & Run Setup)

### Method 1: Cloudflare Dashboard + Git (No Terminal Required)

The quickest way to deploy directly from the browser:

1. **Fork or Import this repository**:
   - Click the **Fork** button on this repository (set it to **Private** if you want to keep your webhook URL inside `config.js`).
   - Edit `config.js` directly on GitHub: add your channel handles to `STATIC_TARGETS` and paste your `DISCORD_WEBHOOK_URL`.
2. **Connect to Cloudflare**:
   - Open your [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Compute (Workers) > Workers & Pages**.
   - Click **Create Application** > choose the **Workers** tab > click **Connect to Git**.
   - Select your GitHub account and pick your `discohooktube` repository.
3. **Deploy & Schedule**:
   - Click **Save and Deploy**. Cloudflare automatically detects `wrangler.toml` and bundles all modular files.
   - Once deployment completes, navigate to **Settings > Triggers** on your Worker page.
   - Under **Cron Triggers**, click **Add Trigger** and set the schedule (e.g., `*/3 * * * *` to check every 3 minutes).

Your notifier is now completely active in the background.

---

### Method 2: Wrangler CLI (Terminal Deployment)

For developers who prefer local setup via command line (requires [Node.js](https://nodejs.org/)):

1. **Clone the repository**:
   ```bash
   git clone [https://github.com/rwt-dev/discohooktube.git](https://github.com/rwt-dev/discohooktube.git)
   cd discohooktube
   ```
2. **Edit `config.js`**:
   Fill in your `DISCORD_WEBHOOK_URL` and add channels to `STATIC_TARGETS`:
   ```javascript
   export const CONFIG = {
     MODE: "worker_only",
     DISCORD_WEBHOOK_URL: "[https://discord.com/api/webhooks/YOUR_WEBHOOK_URL](https://discord.com/api/webhooks/YOUR_WEBHOOK_URL)",
     STATIC_TARGETS: [
       "@YouTubeCreator",
       "[https://www.youtube.com/@AnotherStreamer](https://www.youtube.com/@AnotherStreamer)"
     ],
     ROLE_ID: "", // "everyone" or numerical Discord Role ID
     CONTENT_FILTER: "all", // "all" | "live_only" | "video_only"
     IGNORE_SHORTS: true
   };
   ```
3. **Authenticate & Deploy**:
   ```bash
   npx wrangler login
   npx wrangler deploy
   ```
   *Wrangler uploads the files and registers the automated cron schedule automatically.*

---

## Operating Modes

### Mode 1: `worker_only` (Default)
- No database needed.
- Uses Cloudflare Edge Cache internally to prevent duplicate notifications.
- Define channels in `STATIC_TARGETS` inside `config.js` and notifications will route to `DISCORD_WEBHOOK_URL`.

### Mode 2: `standalone_ui` (Dynamic Web Panel)
Provides a lightweight web UI to add or remove YouTube channels without touching code.

1. Create a Cloudflare D1 database:
   ```bash
   npx wrangler d1 create dht-database
   ```
2. Open `wrangler.toml`, uncomment the D1 section, and insert your database ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "dht-database"
   database_id = "PASTE_YOUR_DATABASE_ID_HERE"
   ```
3. In `config.js`, change `MODE: "standalone_ui"` and specify a secure `DASHBOARD_PASSWORD`.
4. Deploy the Worker and open your panel:
   ```text
   [https://your-worker-name.your-subdomain.workers.dev/?pass=YOUR_PASSWORD](https://your-worker-name.your-subdomain.workers.dev/?pass=YOUR_PASSWORD)
   ```

---

## Template Variables

Customize `MESSAGES.LIVE` and `MESSAGES.VIDEO` in `config.js` using these tags:

- `{channel}` : Channel name
- `{title}`   : Video or stream title
- `{url}`     : Direct content link
- `{role}`    : Parsed role ping (`@everyone` or `<@&ID>`)
- `{desc}`    : First paragraph of description
- `{type}`    : Content type (`Live Stream` or `New Video`)
- `{time}`    : Discord native relative timestamp
- `{logo}`    : Official YouTube Discord emoji

---

## License

This project is licensed under the [MIT License](LICENSE).