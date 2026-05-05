// reyway.com 問卷系統 API
// KV 結構（用 REYWAY_AUTH KV、survey: 前綴）：
//   survey:def:{id}              → { id, title, description, questions, createdAt, isActive }
//   survey:list                  → [{ id, title, createdAt, responseCount }, ...]
//   survey:resp:{id}:{ts}_{uuid} → { surveyId, who, answers, submittedAt }
//   survey:resp:list:{id}        → [resp_key, ...]

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
  const auth = req.headers.get('X-Owner-Token') || '';
  return auth === OWNER_EMAIL;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function csvEscape(s) {
  if (s == null) return '';
  const v = String(s).replace(/"/g, '""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const surveyId = url.searchParams.get('id');

  if (request.method === 'OPTIONS') return new Response('', { headers: CORS });

  // ── POST ?action=submit&id=xxx → 任何人提交 ──
  if (request.method === 'POST' && action === 'submit') {
    if (!surveyId) return json({ error: 'missing id' }, 400);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

    const { who, answers, title } = body;
    if (!who || !answers) return json({ error: 'missing who or answers' }, 400);

    const ts = Date.now();
    const respKey = `survey:resp:${surveyId}:${ts}_${genId()}`;
    const resp = {
      surveyId,
      who: String(who).slice(0, 50),
      answers,
      submittedAt: new Date().toISOString(),
    };
    await env.REYWAY_AUTH.put(respKey, JSON.stringify(resp));

    // 加進 resp list 索引
    const respListKey = `survey:resp:list:${surveyId}`;
    const existingResp = await env.REYWAY_AUTH.get(respListKey);
    const respList = existingResp ? JSON.parse(existingResp) : [];
    respList.push(respKey);
    await env.REYWAY_AUTH.put(respListKey, JSON.stringify(respList));

    // 🆕 auto-register：如果 survey:list 還沒這個問卷、自動加上去（後台才看得到）
    const listKey = 'survey:list';
    const allListRaw = await env.REYWAY_AUTH.get(listKey);
    let allList = allListRaw ? JSON.parse(allListRaw) : [];
    if (!allList.find(s => s.id === surveyId)) {
      allList.push({
        id: surveyId,
        title: title || surveyId,
        createdAt: new Date().toISOString(),
        auto: true,
      });
      await env.REYWAY_AUTH.put(listKey, JSON.stringify(allList));
    }

    return json({ ok: true, respKey });
  }

  // ── GET ?action=list → 後台用 ──
  if (request.method === 'GET' && action === 'list') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 401);
    const raw = await env.REYWAY_AUTH.get('survey:list');
    let list = raw ? JSON.parse(raw) : [];
    // 補上每份問卷的回覆數（從 resp:list 拿）
    for (const s of list) {
      const respList = await env.REYWAY_AUTH.get(`survey:resp:list:${s.id}`);
      s.responseCount = respList ? JSON.parse(respList).length : 0;
    }
    return json({ list });
  }

  // ── GET ?action=responses&id=xxx → 後台看某問卷所有回覆 ──
  if (request.method === 'GET' && action === 'responses') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 401);
    if (!surveyId) return json({ error: 'missing id' }, 400);

    const listKey = `survey:resp:list:${surveyId}`;
    const listRaw = await env.REYWAY_AUTH.get(listKey);
    const respKeys = listRaw ? JSON.parse(listRaw) : [];

    const responses = [];
    for (const k of respKeys) {
      const r = await env.REYWAY_AUTH.get(k);
      if (r) responses.push(JSON.parse(r));
    }
    // 倒序（新的在前）
    responses.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

    return json({ surveyId, count: responses.length, responses });
  }

  // ── GET ?action=export&id=xxx → 匯出 CSV ──
  if (request.method === 'GET' && action === 'export') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 401);
    if (!surveyId) return json({ error: 'missing id' }, 400);

    // 拿問卷定義（題目順序 + 標籤）
    const defRaw = await env.REYWAY_AUTH.get(`survey:def:${surveyId}`);
    const def = defRaw ? JSON.parse(defRaw) : null;

    // 拿所有回覆
    const listRaw = await env.REYWAY_AUTH.get(`survey:resp:list:${surveyId}`);
    const respKeys = listRaw ? JSON.parse(listRaw) : [];
    const responses = [];
    for (const k of respKeys) {
      const r = await env.REYWAY_AUTH.get(k);
      if (r) responses.push(JSON.parse(r));
    }
    responses.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

    // 抽所有 question keys（從 def 或從 responses 第一筆推）
    let qKeys = [];
    if (def && def.questions) {
      qKeys = def.questions.map((q, i) => q.key || `q${i + 1}`);
    } else if (responses.length > 0) {
      qKeys = Object.keys(responses[0].answers || {});
    }

    // 組 CSV
    const headers = ['提交時間', '填表人', ...qKeys];
    const rows = [headers.map(csvEscape).join(',')];
    for (const r of responses) {
      const row = [
        r.submittedAt,
        r.who,
        ...qKeys.map(k => (r.answers && r.answers[k]) || ''),
      ];
      rows.push(row.map(csvEscape).join(','));
    }
    const csv = '﻿' + rows.join('\n'); // BOM 防 Excel 中文亂碼

    return new Response(csv, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="survey-${surveyId}-${Date.now()}.csv"`,
      },
    });
  }

  // ── POST ?action=create → 後台新建問卷 ──
  if (request.method === 'POST' && action === 'create') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

    const { title, description, questions } = body;
    if (!title || !Array.isArray(questions)) return json({ error: 'missing title/questions' }, 400);

    const id = genId();
    const def = {
      id, title, description: description || '',
      questions, createdAt: new Date().toISOString(),
      isActive: true,
    };
    await env.REYWAY_AUTH.put(`survey:def:${id}`, JSON.stringify(def));

    // 加進 list
    const listRaw = await env.REYWAY_AUTH.get('survey:list');
    const list = listRaw ? JSON.parse(listRaw) : [];
    list.push({ id, title, createdAt: def.createdAt });
    await env.REYWAY_AUTH.put('survey:list', JSON.stringify(list));

    return json({ ok: true, id, def });
  }

  // ── PATCH ?action=register&id=xxx → 註冊靜態問卷（manager-ai-survey 用） ──
  // 因為 manager-ai-survey 是手寫 HTML、要先註冊一筆 def 才能匯出
  if (request.method === 'POST' && action === 'register') {
    if (!isOwner(request)) return json({ error: 'unauthorized' }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

    const { id, title, questions } = body;
    if (!id || !title) return json({ error: 'missing id/title' }, 400);

    const def = {
      id, title, description: body.description || '',
      questions: questions || [],
      createdAt: new Date().toISOString(),
      isActive: true,
      registered: true, // 標記為手動註冊
    };
    await env.REYWAY_AUTH.put(`survey:def:${id}`, JSON.stringify(def));

    const listRaw = await env.REYWAY_AUTH.get('survey:list');
    const list = listRaw ? JSON.parse(listRaw) : [];
    if (!list.find(s => s.id === id)) {
      list.push({ id, title, createdAt: def.createdAt });
      await env.REYWAY_AUTH.put('survey:list', JSON.stringify(list));
    }

    return json({ ok: true, id });
  }

  return json({ error: 'unknown action' }, 400);
}
