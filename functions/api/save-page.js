/**
 * 主管暖身課 / 正課 編輯模式 — 儲存上線 API
 * POST /api/save-page
 * body: { page: 'manager-prologue' | 'manager-training', html: string, message?: string }
 *
 * 流程：
 * 1. 把改後 HTML 推回 GitHub repo（rey555ddd/reyway-portal）
 * 2. 觸發 Cloudflare Pages 重新部署（從 git 抓最新版）
 * 3. 1-2 分鐘後 production 上線
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400);
  }

  const { page, html, message } = body || {};

  // 白名單：只允許這三頁
  if (!['manager-prologue', 'manager-training', 'manager-starter-pack'].includes(page)) {
    return json({ ok: false, error: 'page not allowed' }, 400);
  }
  if (typeof html !== 'string' || html.length < 1000 || html.length > 5_000_000) {
    return json({ ok: false, error: 'html size invalid' }, 400);
  }

  // 環境變數檢查
  const GH_TOKEN = env.GITHUB_TOKEN;
  const CF_TOKEN = env.CF_API_TOKEN;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  if (!GH_TOKEN) return json({ ok: false, error: 'GITHUB_TOKEN not set' }, 500);

  const repo = 'rey555ddd/reyway-portal';
  const path = `knowledge/教學/${page}.html`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`;
  const ghHeaders = {
    'Authorization': `Bearer ${GH_TOKEN}`,
    'User-Agent': 'reyway-edit-mode',
    'Accept': 'application/vnd.github.v3+json',
  };

  // 1. 拿目前的 SHA
  let sha;
  try {
    const getRes = await fetch(apiUrl, { headers: ghHeaders });
    if (!getRes.ok) {
      return json({ ok: false, error: `github get failed: ${getRes.status}` }, 500);
    }
    const fileData = await getRes.json();
    sha = fileData.sha;
  } catch (e) {
    return json({ ok: false, error: `github get error: ${e.message}` }, 500);
  }

  // 2. base64 encode HTML（utf-8 safe）
  const contentB64 = utf8ToBase64(html);

  // 3. PUT 寫回
  try {
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `[edit-mode] update ${page}`,
        content: contentB64,
        sha,
        branch: 'main',
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      return json({ ok: false, error: `github put failed: ${putRes.status} ${err.slice(0,200)}` }, 500);
    }
  } catch (e) {
    return json({ ok: false, error: `github put error: ${e.message}` }, 500);
  }

  // 4. 觸發 CF Pages 重新部署（如有 token）
  let deployTriggered = false;
  if (CF_TOKEN && CF_ACCOUNT_ID) {
    try {
      const deployRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/reyway/deployments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CF_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      deployTriggered = deployRes.ok;
    } catch {
      // 失敗就算了、git push 也會讓 CF 自動 deploy（如果連著的話）
    }
  }

  return json({
    ok: true,
    page,
    deployTriggered,
    estimatedSeconds: deployTriggered ? 90 : 120,
    message: deployTriggered
      ? '已 commit 到 GitHub + 觸發 CF Pages 部署、約 1-2 分鐘上線'
      : '已 commit 到 GitHub、CF Pages 會自動部署、約 2 分鐘上線',
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// utf-8 string → base64（CF Workers safe）
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
