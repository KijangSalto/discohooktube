export function renderDashboard(channels = []) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DiscoHookTube Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    h1 { font-size: 1.25rem; margin-top: 0; margin-bottom: 1rem; color: #e2e8f0; }
    form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    input[type="text"] { flex: 1; padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid #334155; background: #0f172a; color: #fff; }
    button { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 500; }
    button:hover { background: #dc2626; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #334155; }
    .chan { display: flex; align-items: center; gap: 0.75rem; }
    .chan img { width: 32px; height: 32px; border-radius: 50%; }
    .del-btn { background: #334155; padding: 0.25rem 0.5rem; font-size: 0.8rem; }
    .del-btn:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>DiscoHookTube Channels</h1>
    <form method="POST">
      <input type="hidden" name="action" value="add">
      <input type="text" name="channel" placeholder="@CreatorHandle or URL" required>
      <button type="submit">Add Target</button>
    </form>
    <ul>
      ${channels.map(c => `
        <li>
          <div class="chan">
            ${c.avatar ? `<img src="${c.avatar}" alt="">` : ""}
            <span>${c.name}</span>
          </div>
          <form method="POST" style="margin:0;">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="${c.id}">
            <button class="del-btn" type="submit">Remove</button>
          </form>
        </li>
      `).join("")}
    </ul>
  </div>
</body>
</html>`;
}