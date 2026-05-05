// reyway.com 登入審核 API
// KV 結構：
//   approved:{email}  → { name, email, approvedAt }
//   pending:{email}   → { name, email, requestedAt }

const OWNER_EMAIL = 'reysionchen@gmail.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// 驗證是主公的簡易 token（用 email + secret）
function isOwner(req) {
  const auth = req.headers.get('X-Owner-Token') || '';
  return auth === OWNER_EMAIL; // 簡易版，前端帶 email header 驗身
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

  // ── GET /api/auth?action=status&email=xxx ──
  if (request.method === 'GET' && action === 'status') {
    const email = url.searchParams.get('email');
    if (!email) return json({ error: 'missing email' }, 400);

    if (email === OWNER_EMAIL) return json({ status: 'approved' });

    const approved = await env.REYWAY_AUTH.get(`approved:${email}`);
    if (approved) return json({ status: 'approved', ...JSON.parse(approved) });

    const pending = await env.REYWAY_AUTH.get(`pending:${email}`);
    if (pending) return json({ status: 'pending', ...JSON.parse(pending) });

    return json({ status: 'unknown' });
  }

  // ── POST /api/auth?action=request ── 申請登入
  if (request.method === 'POST' && action === 'request') {
    const { email, name } = await request.json();
    if (!email) return json({ error: 'missing email' }, 400);
    if (email === OWNER_EMAIL) return json({ status: 'approved' });

    // 已核准就直接回
    const approved = await env.REYWAY_AUTH.get(`approved:${email}`);
    if (approved) return json({ status: 'approved' });

    // 寫入 pending
    await env.REYWAY_AUTH.put(`pending:${email}`, JSON.stringify({
      name: name || email,
      email,
      requestedAt: new Date().toISOString(),
    }));

    return json({ status: 'pending' });
  }

  // ── GET /api/auth?action=pending ── 主公看待審清單
  if (request.method === 'GET' && action === 'pending') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 403);

    const list = await env.REYWAY_AUTH.list({ prefix: 'pending:' });
    const pending = await Promise.all(
      list.keys.map(async k => {
        const val = await env.REYWAY_AUTH.get(k.name);
        return val ? JSON.parse(val) : null;
      })
    );
    return json({ pending: pending.filter(Boolean) });
  }

  // ── POST /api/auth?action=approve ── 審核通過
  if (request.method === 'POST' && action === 'approve') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 403);

    const { email, reject } = await request.json();
    if (!email) return json({ error: 'missing email' }, 400);

    await env.REYWAY_AUTH.delete(`pending:${email}`);

    if (!reject) {
      const pendingData = await env.REYWAY_AUTH.get(`pending:${email}`);
      await env.REYWAY_AUTH.put(`approved:${email}`, JSON.stringify({
        email,
        approvedAt: new Date().toISOString(),
      }));
    }

    return json({ ok: true, action: reject ? 'rejected' : 'approved' });
  }

  return json({ error: 'not found' }, 404);
}
