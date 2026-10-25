# DiscoHookTube (Open Source Edition)

A lightweight, serverless YouTube-to-Discord notification engine built for Cloudflare Workers. It uses native Discord Webhooks with custom embeds, live-stream priority detection, and anti-spam filters—eliminating the need for third-party bots.

---

> [!WARNING]
> **CRITICAL SECURITY NOTICE**  
> If you fork or push this repository publicly to GitHub, **NEVER commit sensitive credentials** (such as Discord Webhook URLs, Cloudflare API tokens, or `DASHBOARD_PASSWORD`) into public commits. Keep your fork **Private**, or inject sensitive credentials using Cloudflare Environment Secrets (`wrangler secret put`).

---

## Features

- **Zero-Bot Architecture**: Operates exclusively via official Discord Webhooks.
- **Accurate Live Detection**: Prioritizes YouTube's `/live` stream state to avoid false alerts on scheduled broadcasts.
- **Two Flexible Operating Modes**:
  - `worker_only`: Zero database and zero UI. Configure via `config.js` and run via automated Cron Triggers.
  - `standalone_ui`: Lightweight single-page web dashboard backed by Cloudflare D1.
- **Dynamic Formatting**: Embed customization, flexible role tagging, and anti-spam Shorts filtering.

---

## Deployment Options

Choose the installation method that fits your workflow:

### Method 1: Cloudflare Dashboard + GitHub Integration (No CLI Required)

Recommended for users who prefer configuring everything directly inside the browser.

1. **Fork this repository** to your own GitHub account (make sure to set your fork to **Private** to keep your Webhook URL confidential).
2. Edit `config.js` directly on GitHub:
   - Choose your `MODE` (`worker_only` or `standalone_ui`).
   - Fill in your `DISCORD_WEBHOOK_URL` and `STATIC_TARGETS`.
3. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Compute (Workers) > Workers & Pages**.
4. Click **Create** > select the **Pages or Git Integration** tab > connect your GitHub account.
5. Select your forked `discohooktube` repository and click **Deploy**.
6. Set the Automated Check Interval:
   - Once deployed, open your Worker settings in Cloudflare.
   - Navigate to the **Settings > Triggers** tab.
   - Under **Cron Triggers**, click **Add Trigger** and set the schedule (e.g., `*/3 * * * *` to check every 3 minutes).

---

### Method 2: Wrangler CLI (Fast Terminal Deployment)

Recommended for developers who prefer command-line setups. Requires [Node.js](https://nodejs.org/) installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/rwt-dev/discohooktube.git](https://github.com/rwt-dev/discohooktube.git)
   cd discohooktube
   ```

2. **Configure `config.js`:**
   Open `config.js` in any text editor and adjust your preferences:
   ```javascript
   export const CONFIG = {
     MODE: "worker_only", // "worker_only" or "standalone_ui"
     DISCORD_WEBHOOK_URL: "[https://discord.com/api/webhooks/YOUR_WEBHOOK_URL](https://discord.com/api/webhooks/YOUR_WEBHOOK_URL)",
     STATIC_TARGETS: [
       "@YouTubeCreator",
       "[https://www.youtube.com/@AnotherStreamer](https://www.youtube.com/@AnotherStreamer)"
     ],
     ROLE_ID: "", // "everyone" or numeric Discord Role ID
     CONTENT_FILTER: "all", // "all" | "live_only" | "video_only"
     IGNORE_SHORTS: true
   };
   ```

3. **Log in to Cloudflare:**
   ```bash
   npx wrangler login
   ```
   *Your browser will open automatically. Click **Allow** to authenticate Wrangler.*

4. **Deploy:**
   ```bash
   npx wrangler deploy
   ```
   *Wrangler will upload the script and activate the cron trigger defined in `wrangler.toml` immediately.*

---

## Operating Modes

### Mode 1: `worker_only` (Default & Simplest)
- Requires zero databases.
- State is preserved across cron checks via Cloudflare Edge Cache / KV.
- Add YouTube channels to the `STATIC_TARGETS` array separated by commas.
- Dispatches all notifications to the single `DISCORD_WEBHOOK_URL`.

### Mode 2: `standalone_ui` (Dynamic Web Dashboard)
Provides a clean, minimalist web interface to add or delete monitored channels without editing code.

1. Create a Cloudflare D1 database:
   ```bash
   npx wrangler d1 create dht-database
   ```
2. Copy the resulting `database_id` from your terminal, open `wrangler.toml`, and update the D1 binding:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "dht-database"
   database_id = "PASTE_YOUR_DATABASE_ID_HERE"
   ```
3. In `config.js`, set `MODE: "standalone_ui"` and define your `DASHBOARD_PASSWORD`.
4. Run `npx wrangler deploy`. Access your private dashboard by visiting:
   ```text
   [https://your-worker.workers.dev/?pass=YOUR_PASSWORD](https://your-worker.workers.dev/?pass=YOUR_PASSWORD)
   ```

---

## Cron Schedule Customization

The checking interval is configured in `wrangler.toml`:
```toml
[triggers]
crons = ["*/3 * * * *"] # Executes every 3 minutes
```
You can adjust this interval anytime before running `npx wrangler deploy` (or via Cloudflare Dashboard under **Triggers**).

---

## Template Variables

Customize `MESSAGES.LIVE` and `MESSAGES.VIDEO` using these dynamic tags:

- `{channel}` : Channel name
- `{title}`   : Video or stream title
- `{url}`     : Content URL link
- `{role}`    : Parsed role mention (`@everyone` or `<@&ID>`)
- `{desc}`    : First paragraph of video description
- `{type}`    : Content classification (`Live Stream` or `New Video`)
- `{time}`    : Discord native relative timestamp
- `{logo}`    : Official YouTube Discord emoji

> [!NOTE]  
> If `ROLE_ID` is set but `{role}` is omitted from your template, the role ping is automatically prepended to the start of the message.

---

## License

This project is licensed under the [MIT License](LICENSE).
