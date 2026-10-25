export const CONFIG = {
  // Operating Mode: "worker_only" (Headless / Zero DB) or "standalone_ui" (Web Dashboard + D1)
  MODE: "worker_only",

  // Discord Webhook URL where alerts will be dispatched
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE",

  // Target YouTube Channels for "worker_only" mode (Accepts Handles, URLs, or Channel IDs)
  STATIC_TARGETS: [
    "@YouTubeCreator",
    "https://www.youtube.com/@AnotherStreamer",
    "UCBR8-60-B28hp2BmDPdntcQ"
  ],

  // Role ping ID ("everyone" or numeric role ID: "123456789012345678", leave empty for none)
  ROLE_ID: "",

  // Content Filtering: "all" | "live_only" | "video_only"
  CONTENT_FILTER: "all",

  // Automatically ignore YouTube Shorts uploads
  IGNORE_SHORTS: true,

  // Notification Message Templates
  MESSAGES: {
    LIVE: "{logo} {role} **{channel}** is now live!\n{title} - {url}",
    VIDEO: "{logo} {role} **{channel}** just uploaded a new video!\n{title} - {url}"
  },

  // Discord Embed Presentation Settings
  EMBED: {
    ACCENT_COLOR: "#FF0000",
    LAYOUT: "banner", // "banner" (large thumbnail) or "thumbnail" (side thumbnail)
    FOOTER_TEXT: "YouTube {type}",
    FOOTER_ICON: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png"
  },

  // Configuration for "standalone_ui" mode only
  DASHBOARD_PASSWORD: "adminpassword123",
  D1_BINDING_NAME: "DB"
};