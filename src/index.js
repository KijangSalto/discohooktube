import { CONFIG } from '../config.js';
import { renderDashboard } from './ui.js';

function cleanDescription(rawDesc) {
  if (!rawDesc) return "";
  let clean = rawDesc
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\t/g, " ")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .trim();

  const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) return "";

  let text = paragraphs[0];
  const maxChars = 400;
  if (text.length > maxChars) {
    let cut = text.substring(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    text = (lastSpace > 0 ? cut.substring(0, lastSpace) : cut).trim() + "...";
  }
  return text;
}

function parseRoleTag(roleId) {
  if (!roleId) return "";
  const trimmed = roleId.trim();
  if (trimmed.toLowerCase() === "everyone" || trimmed === "@everyone") return "@everyone";
  const cleanNum = trimmed.replace(/[^0-9]/g, "");
  return cleanNum ? `<@&${cleanNum}>` : "";
}

function replaceTags(template, content, roleTag) {
  const ytEmoji = "<:youtube:1408204133592334346>";
  const unix = Math.floor(new Date(content.timestamp).getTime() / 1000);
  const relTime = `<t:${unix}:R>`;

  let rendered = template
    .replaceAll("{channel}", `**${content.author}**`)
    .replaceAll("{akun}", `**${content.author}**`)
    .replaceAll("{title}", content.title)
    .replaceAll("{judul}", content.title)
    .replaceAll("{url}", content.url)
    .replaceAll("{link}", content.url)
    .replaceAll("{desc}", content.description || "")
    .replaceAll("{description}", content.description || "")
    .replaceAll("{type}", content.is_live ? "Live Stream" : "New Video")
    .replaceAll("{tipe}", content.is_live ? "Live Streaming" : "Video Baru")
    .replaceAll("{time}", relTime)
    .replaceAll("{waktu}", relTime)
    .replaceAll("{logo}", ytEmoji);

  if (rendered.includes("{role}")) {
    rendered = rendered.replaceAll("{role}", roleTag ? `${roleTag} ` : "").trim();
  } else if (roleTag) {
    rendered = `${roleTag} ${rendered}`;
  }

  return rendered.trim().substring(0, 2000);
}

async function isYouTubeShort(videoId) {
  try {
    const res = await fetch("https://www.youtube.com/shorts/" + videoId, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function getYouTubeThumbnail(videoId) {
  const maxRes = "https://i.ytimg.com/vi/" + videoId + "/maxresdefault.jpg";
  try {
    const res = await fetch(maxRes, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (res.ok && res.headers.get("content-length") !== "1097") return maxRes;
  } catch {}
  return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
}

async function resolveYouTubeChannel(rawInput) {
  let cleaned = rawInput.trim();
  let handle = cleaned;

  const matchHandle = cleaned.match(/@([a-zA-Z0-9_.-]+)/);
  if (matchHandle) {
    handle = "@" + matchHandle[1];
  } else if (!handle.startsWith("UC") && !handle.startsWith("@") && !handle.includes("/")) {
    handle = "@" + handle;
  }

  const targetUrl = cleaned.startsWith("http")
    ? cleaned
    : (cleaned.startsWith("UC") ? "https://www.youtube.com/channel/" + cleaned : "https://www.youtube.com/" + handle);

  const page = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  const html = await page.text();

  const idMatch = html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/i) ||
                  html.match(/itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]{22})"/i) ||
                  html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/i) ||
                  html.match(/href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/i);

  const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/"title":"([^"]+)"/i);
  const avatarMatch = html.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/i) || html.match(/<meta property="og:image" content="([^"]+)"/i);

  let avatarUrl = avatarMatch ? avatarMatch[1] : "";
  if (avatarUrl.startsWith("//")) avatarUrl = "https:" + avatarUrl;

  if (idMatch && idMatch[1]) {
    return {
      channelId: idMatch[1],
      channelName: nameMatch ? nameMatch[1] : handle,
      avatarUrl
    };
  }
  throw new Error("Unable to resolve Channel ID for: " + rawInput);
}

async function fetchLatestContent(channelId, fallbackAvatar = "") {
  try {
    try {
      const liveRes = await fetch("https://www.youtube.com/channel/" + channelId + "/live", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        redirect: "follow"
      });

      if (liveRes.ok) {
        const liveHtml = await liveRes.text();
        const isUpcoming = liveHtml.includes('"status":"UPCOMING"') ||
                           liveHtml.includes('"isUpcoming":true') ||
                           liveHtml.includes('"upcomingEventData"');

        const isCurrentlyLive = !isUpcoming && (
          liveHtml.includes('"status":"LIVE"') ||
          liveHtml.includes('"isLive":true') ||
          (!liveHtml.includes('"LIVE_STREAM_OFFLINE"') && liveHtml.includes('BADGE_STYLE_TYPE_LIVE_NOW'))
        );

        const vidIdMatch = liveHtml.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/i) ||
                           liveHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);

        if (isCurrentlyLive && vidIdMatch && vidIdMatch[1]) {
          const liveVidId = vidIdMatch[1];
          const titleMatch = liveHtml.match(/<meta property="og:title" content="([^"]+)"/i) || liveHtml.match(/"title":"([^"]+)"/);
          const descMatch = liveHtml.match(/<meta property="og:description" content="([^"]+)"/i) || liveHtml.match(/"shortDescription":"([^"]+)"/);
          const authorMatch = liveHtml.match(/<meta property="og:site_name" content="([^"]+)"/i) || liveHtml.match(/"author":"([^"]+)"/);
          const bannerUrl = await getYouTubeThumbnail(liveVidId);

          return {
            id: liveVidId,
            title: titleMatch ? titleMatch[1] : "YouTube Live Stream",
            author: authorMatch ? authorMatch[1] : "YouTube Channel",
            is_live: true,
            is_archive: false,
            content_type: "Live Stream",
            description: cleanDescription(descMatch ? descMatch[1] : ""),
            url: "https://www.youtube.com/watch?v=" + liveVidId,
            banner: bannerUrl,
            avatar: fallbackAvatar,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch {}

    const rssRes = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId);
    if (!rssRes.ok) return null;
    const xml = await rssRes.text();

    const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
    if (!entry) return null;

    const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
    const rawDesc = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] || "";
    const pubDate = entry.match(/<published>(.*?)<\/published>/)?.[1] || new Date().toISOString();
    const author = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>/)?.[1] || "YouTube Creator";

    if (!videoId) return null;

    return {
      id: videoId,
      title: title ? title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "New Video",
      author,
      is_live: false,
      is_archive: false,
      content_type: "Video",
      description: cleanDescription(rawDesc),
      url: "https://www.youtube.com/watch?v=" + videoId,
      banner: await getYouTubeThumbnail(videoId),
      avatar: fallbackAvatar,
      timestamp: pubDate
    };
  } catch {
    return null;
  }
}

async function dispatchDiscordAlert(webhookUrl, content, roleId) {
  const roleTag = parseRoleTag(roleId);
  const template = content.is_live ? CONFIG.MESSAGES.LIVE : CONFIG.MESSAGES.VIDEO;
  const messageContent = replaceTags(template, content, roleTag);

  const hexColor = CONFIG.EMBED.ACCENT_COLOR.replace("#", "");
  const colorDecimal = parseInt(hexColor, 16) || 16711680;
  const footerText = CONFIG.EMBED.FOOTER_TEXT.replace("{type}", content.is_live ? "Live Stream" : "New Video");

  const embed = {
    title: content.title.substring(0, 256),
    url: content.url,
    color: colorDecimal,
    timestamp: content.timestamp,
    footer: {
      text: footerText,
      icon_url: CONFIG.EMBED.FOOTER_ICON
    }
  };

  if (content.author) {
    embed.author = {
      name: content.author,
      url: content.url,
      icon_url: content.avatar || undefined
    };
  }

  if (content.description) {
    embed.description = content.description;
  }

  if (CONFIG.EMBED.LAYOUT === "thumbnail") {
    embed.thumbnail = { url: content.banner };
  } else {
    embed.image = { url: content.banner };
  }

  const payload = {
    content: messageContent,
    embeds: [embed]
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return res.ok;
}

async function checkEdgeCacheState(key) {
  const cache = caches.default;
  const cacheUrl = new URL(`https://dht-cache.internal/${key}`);
  const cached = await cache.match(cacheUrl);
  return !!cached;
}

async function markEdgeCacheState(key, ttlSec = 86400 * 7) {
  const cache = caches.default;
  const cacheUrl = new URL(`https://dht-cache.internal/${key}`);
  const response = new Response("NOTIFIED", {
    headers: { "Cache-Control": `max-age=${ttlSec}` }
  });
  await cache.put(cacheUrl, response);
}

async function initD1Schema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      last_video_id TEXT,
      last_live_id TEXT,
      role_id TEXT,
      webhook_url TEXT
    );
  `);
}

async function runNotifierPipeline(env) {
  const isWorkerOnly = CONFIG.MODE === "worker_only" || !env[CONFIG.D1_BINDING_NAME];

  if (isWorkerOnly) {
    for (const target of CONFIG.STATIC_TARGETS) {
      try {
        const resolved = await resolveYouTubeChannel(target);
        const latest = await fetchLatestContent(resolved.channelId, resolved.avatarUrl);
        if (!latest) continue;

        if (CONFIG.CONTENT_FILTER === "live_only" && !latest.is_live) continue;
        if (CONFIG.CONTENT_FILTER === "video_only" && latest.is_live) continue;

        if (!latest.is_live && CONFIG.IGNORE_SHORTS) {
          const isShort = await isYouTubeShort(latest.id);
          if (isShort) continue;
        }

        const stateKey = `${resolved.channelId}_${latest.id}_${latest.is_live ? "live" : "vid"}`;
        const alreadyNotified = await checkEdgeCacheState(stateKey);
        if (alreadyNotified) continue;

        const success = await dispatchDiscordAlert(CONFIG.DISCORD_WEBHOOK_URL, latest, CONFIG.ROLE_ID);
        if (success) {
          await markEdgeCacheState(stateKey);
        }
      } catch (err) {
        console.error(`Pipeline error for ${target}:`, err);
      }
    }
  } else {
    const db = env[CONFIG.D1_BINDING_NAME];
    await initD1Schema(db);

    const { results: channels } = await db.prepare("SELECT * FROM channels").all();
    for (const ch of channels || []) {
      try {
        const latest = await fetchLatestContent(ch.id, ch.avatar);
        if (!latest) continue;

        if (CONFIG.CONTENT_FILTER === "live_only" && !latest.is_live) continue;
        if (CONFIG.CONTENT_FILTER === "video_only" && latest.is_live) continue;

        if (!latest.is_live && CONFIG.IGNORE_SHORTS) {
          const isShort = await isYouTubeShort(latest.id);
          if (isShort) continue;
        }

        if (latest.is_live && ch.last_live_id === latest.id) continue;
        if (!latest.is_live && ch.last_video_id === latest.id) continue;

        const hook = ch.webhook_url || CONFIG.DISCORD_WEBHOOK_URL;
        const role = ch.role_id || CONFIG.ROLE_ID;

        const sent = await dispatchDiscordAlert(hook, latest, role);
        if (sent) {
          if (latest.is_live) {
            await db.prepare("UPDATE channels SET last_live_id = ? WHERE id = ?").bind(latest.id, ch.id).run();
          } else {
            await db.prepare("UPDATE channels SET last_video_id = ? WHERE id = ?").bind(latest.id, ch.id).run();
          }
        }
      } catch (err) {
        console.error(`Pipeline error for ${ch.id}:`, err);
      }
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runNotifierPipeline(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/run") {
      await runNotifierPipeline(env);
      return new Response("Notifier execution triggered successfully.", { status: 200 });
    }

    if (CONFIG.MODE === "standalone_ui" && env[CONFIG.D1_BINDING_NAME]) {
      const pass = url.searchParams.get("pass");
      if (pass !== CONFIG.DASHBOARD_PASSWORD) {
        return new Response("Unauthorized Access. Pass valid ?pass= parameter.", { status: 401 });
      }

      const db = env[CONFIG.D1_BINDING_NAME];
      await initD1Schema(db);

      if (request.method === "POST") {
        const formData = await request.formData();
        const action = formData.get("action");

        if (action === "add") {
          const rawTarget = formData.get("channel");
          try {
            const resolved = await resolveYouTubeChannel(rawTarget);
            await db.prepare("INSERT OR REPLACE INTO channels (id, name, avatar) VALUES (?, ?, ?)")
              .bind(resolved.channelId, resolved.channelName, resolved.avatarUrl)
              .run();
          } catch (e) {
            return new Response("Failed to resolve channel: " + e.message, { status: 400 });
          }
        } else if (action === "delete") {
          const channelId = formData.get("id");
          await db.prepare("DELETE FROM channels WHERE id = ?").bind(channelId).run();
        }

        return Response.redirect(url.toString(), 303);
      }

      const { results: channels } = await db.prepare("SELECT * FROM channels").all();
      return new Response(renderDashboard(channels || []), {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    return new Response("DiscoHookTube Worker is active. Automated checks run on Cron triggers.", { status: 200 });
  }
};