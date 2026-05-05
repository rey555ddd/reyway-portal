// reyway.com /api/ai-costs
// GET  → 讀 REYWAY_AUTH KV（ai-cost:today / ai-cost:month / ai-cost:balance）
// POST → 主公手動更新 Anthropic 剩餘餘額（需 X-Owner-Token）

const OWNER_EMAIL = 'reysionchen@gmail.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Token',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function isOwner(req) {
  return (req.headers.get('X-Owner-Token') || '') === OWNER_EMAIL;
}

export async function onRequest(ctx) {
  const { request, env } = ctx;

  if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

  // ── GET：讀取花費摘要 ──
  if (request.method === 'GET') {
    const [today, month, balance, tasks, agents, inbox] = await Promise.all([
      env.REYWAY_AUTH.get('ai-cost:today',    { type: 'json' }),
      env.REYWAY_AUTH.get('ai-cost:month',    { type: 'json' }),
      env.REYWAY_AUTH.get('ai-cost:balance',  { type: 'json' }),
      env.REYWAY_AUTH.get('ai-tasks:summary', { type: 'json' }),
      env.REYWAY_AUTH.get('ai-agents:status', { type: 'json' }),
      env.REYWAY_AUTH.get('ai-inbox:recent',  { type: 'json' }),
    ]);
    return json({ ok: true, today, month, balance, tasks, agents, inbox });
  }

  // ── POST：手動更新 Anthropic 餘額（主公專用）──
  if (request.method === 'POST') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 403);

    const body = await request.json().catch(() => ({}));

    if (body.action === 'update-balance') {
      const usd = parseFloat(body.usd);
      if (isNaN(usd)) return json({ error: 'invalid usd' }, 400);
      await env.REYWAY_AUTH.put('ai-cost:balance', JSON.stringify({
        usd,
        note: body.note || 'Anthropic 剩餘額度',
        updatedAt: new Date().toISOString(),
      }));
      return json({ ok: true });
    }

    return json({ error: 'unknown action' }, 400);
  }

  return json({ error: 'method not allowed' }, 405);
}
