// reyway.com 文字覆寫 API（主公直接編輯前端文字）
// KV 結構：
//   text:{key}             → 當前文字
//   text-history:{key}     → JSON array、最近 5 筆 snapshot（時間倒序）
//
// API:
//   GET  /api/text                   → 列出所有覆寫 { key: text, ... }
//   GET  /api/text?key=xxx&history=1 → 取單筆 + 5 筆歷史
//   PUT  /api/text                   → body: { key, text }、限 OWNER_EMAIL
//   POST /api/text?action=rollback   → body: { key, version }、回滾到歷史某筆

// 對齊前端 edit-mode.js 的 OWNER_TOKEN
const OWNER_TOKEN = 'sheng0429';
const MAX_HISTORY = 5;
const MAX_TEXT_LEN = 5000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Token',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function isOwner(req) {
  return (req.headers.get('X-Owner-Token') || '').trim() === OWNER_TOKEN;
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

  // ── GET ──
  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    const wantHistory = url.searchParams.get('history') === '1';

    if (key) {
      const text = await env.REYWAY_AUTH.get(`text:${key}`);
      const result = { key, text: text || null };
      if (wantHistory) {
        const h = await env.REYWAY_AUTH.get(`text-history:${key}`);
        result.history = h ? JSON.parse(h) : [];
      }
      return json(result);
    }

    // 列全部
    const list = await env.REYWAY_AUTH.list({ prefix: 'text:' });
    const out = {};
    for (const k of list.keys) {
      const id = k.name.slice(5); // 拿掉 'text:' prefix
      out[id] = await env.REYWAY_AUTH.get(k.name);
    }
    return json({ items: out, count: list.keys.length });
  }

  // ── PUT ── 寫入（限主公）
  if (request.method === 'PUT') {
    if (!isOwner(request)) return json({ error: '只有主公能編輯（X-Owner-Token 不對）' }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
    const key = String(body.key || '').trim();
    const text = String(body.text || '').slice(0, MAX_TEXT_LEN);
    if (!key || !/^[\w-]{1,60}$/.test(key)) return json({ error: 'key 必須 1-60 字、英數/底線/破折號' }, 400);

    // 先撈現有值塞進 history
    const oldText = await env.REYWAY_AUTH.get(`text:${key}`);
    if (oldText && oldText !== text) {
      const histRaw = await env.REYWAY_AUTH.get(`text-history:${key}`);
      const hist = histRaw ? JSON.parse(histRaw) : [];
      hist.unshift({ text: oldText, ts: Date.now() });
      if (hist.length > MAX_HISTORY) hist.length = MAX_HISTORY;
      await env.REYWAY_AUTH.put(`text-history:${key}`, JSON.stringify(hist));
    }

    await env.REYWAY_AUTH.put(`text:${key}`, text);
    return json({ ok: true, key, text, savedAt: Date.now() });
  }

  // ── POST ?action=rollback ── 回滾
  if (request.method === 'POST' && url.searchParams.get('action') === 'rollback') {
    if (!isOwner(request)) return json({ error: '只有主公能回滾' }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
    const key = String(body.key || '').trim();
    const version = parseInt(body.version, 10);
    if (!key || isNaN(version)) return json({ error: '缺 key 或 version' }, 400);

    const histRaw = await env.REYWAY_AUTH.get(`text-history:${key}`);
    const hist = histRaw ? JSON.parse(histRaw) : [];
    if (!hist[version]) return json({ error: '版本不存在' }, 404);

    // 把目前的塞進 history、把選的版本拉出來變現值
    const cur = await env.REYWAY_AUTH.get(`text:${key}`);
    if (cur) {
      hist.unshift({ text: cur, ts: Date.now() });
      if (hist.length > MAX_HISTORY) hist.length = MAX_HISTORY;
    }
    const target = hist.splice(version + 1, 1)[0]; // version+1 因為剛 unshift 一個
    await env.REYWAY_AUTH.put(`text:${key}`, target.text);
    await env.REYWAY_AUTH.put(`text-history:${key}`, JSON.stringify(hist));
    return json({ ok: true, key, text: target.text });
  }

  return json({ error: 'method not allowed' }, 405);
}
