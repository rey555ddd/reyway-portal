// ========================================
// REYWAY Portal · 共用 JS（登入閘 + 審核 + Link Gate）
// ========================================

// ─── 設定 ───
const GOOGLE_CLIENT_ID = '483459469206-36b4ctr9fo0d9j9qgqp22itkp01hk6a2.apps.googleusercontent.com';
const AUTH_KEY = 'reyway_gauth';
const OWNER_EMAIL = 'reysionchen@gmail.com';
const AUTH_TTL_OWNER = 365 * 24 * 60 * 60 * 1000;
const AUTH_TTL_GUEST = 3 * 24 * 60 * 60 * 1000;
// 子頁要往上一層找 /api/auth
const API = (window.location.pathname === '/' || window.location.pathname === '/index.html')
  ? '/api/auth'
  : '/api/auth';

let _currentUser = null;

// ─── 工具 ───
function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }

// ─── 登入後主流程 ───
async function afterLogin(email, name) {
  _currentUser = { email, name };

  if (email === OWNER_EMAIL) {
    hide('site-gate');
    checkPendingNotify();
    return;
  }

  try {
    const res = await fetch(`${API}?action=status&email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (data.status === 'approved') {
      hide('site-gate');
    } else if (data.status === 'pending') {
      hide('site-gate');
      show('pending-gate');
    } else {
      await fetch(`${API}?action=request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      hide('site-gate');
      show('pending-gate');
    }
  } catch (e) {
    hide('site-gate');
    show('pending-gate');
  }
}

// ─── Google 登入回調 ───
function onGoogleSignIn(credential) {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    const ttl = payload.email === OWNER_EMAIL ? AUTH_TTL_OWNER : AUTH_TTL_GUEST;
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      email: payload.email,
      name: payload.name,
      expiry: Date.now() + ttl
    }));
    afterLogin(payload.email, payload.name);
  } catch (e) { alert('登入失敗，請重試'); }
}

// ─── 初始化（頁面載入時） ───
(function () {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (stored && stored.expiry > Date.now()) {
      afterLogin(stored.email, stored.name);
      return;
    }
  } catch (e) {}

  window.addEventListener('load', function () {
    if (typeof google === 'undefined') return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: function (resp) { onGoogleSignIn(resp.credential); },
      auto_select: false,
    });
    google.accounts.id.renderButton(
      document.getElementById('g_signin_btn'),
      { theme: 'outline', size: 'large', shape: 'pill', width: 240, locale: 'zh-TW' }
    );
  });
})();

// ─── 主公：查待審核通知 ───
async function checkPendingNotify() {
  try {
    const res = await fetch(`${API}?action=pending`, {
      headers: { 'X-Owner-Token': OWNER_EMAIL }
    });
    const data = await res.json();
    const count = (data.pending || []).length;
    if (count > 0) {
      const cnt = document.getElementById('notify-count');
      const bar = document.getElementById('notify-bar');
      if (cnt) cnt.textContent = count;
      if (bar) bar.classList.add('show');
    }
  } catch (e) {}
}

// ─── 審核 Modal ───
async function openApproveModal() {
  show('approve-modal');
  const list = document.getElementById('approve-list');
  if (!list) return;
  list.innerHTML = '<div class="approve-empty">載入中…</div>';

  try {
    const res = await fetch(`${API}?action=pending`, {
      headers: { 'X-Owner-Token': OWNER_EMAIL }
    });
    const data = await res.json();
    const pending = data.pending || [];

    if (pending.length === 0) {
      list.innerHTML = '<div class="approve-empty">目前沒有待審核申請</div>';
      return;
    }

    list.innerHTML = pending.map(p => `
      <div class="approve-item" id="item-${btoa(p.email)}">
        <div class="info">
          <div class="name">${p.name || p.email}</div>
          <div class="email">${p.email}</div>
          <div class="time">${new Date(p.requestedAt).toLocaleString('zh-TW')}</div>
        </div>
        <div class="approve-actions">
          <button class="btn-approve" onclick="doApprove('${p.email}', false)">通過</button>
          <button class="btn-reject"  onclick="doApprove('${p.email}', true)">拒絕</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="approve-empty">載入失敗，請重試</div>';
  }
}

async function doApprove(email, reject) {
  await fetch(`${API}?action=approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Token': OWNER_EMAIL },
    body: JSON.stringify({ email, reject })
  });
  const el = document.getElementById('item-' + btoa(email));
  if (el) el.remove();
  const remaining = document.querySelectorAll('.approve-item').length;
  if (remaining === 0) {
    const list = document.getElementById('approve-list');
    if (list) list.innerHTML = '<div class="approve-empty">全部處理完畢 ✓</div>';
    const bar = document.getElementById('notify-bar');
    if (bar) bar.classList.remove('show');
  } else {
    const cnt = document.getElementById('notify-count');
    if (cnt) cnt.textContent = remaining;
  }
}

function closeApproveModal() { hide('approve-modal'); }

// ─── 知識庫 filter（共用，子頁可能用到）───
function filterKb(tag) {
  document.querySelectorAll('.kb-tab').forEach(t => t.classList.remove('active'));
  if (typeof event !== 'undefined' && event.target) event.target.classList.add('active');
  document.querySelectorAll('.kb-card').forEach(card => {
    if (card.classList.contains('kb-empty-hint')) return;
    const match = tag === 'all' || card.dataset.tag === tag;
    card.classList.toggle('hidden', !match);
  });
}

// ─── Link Gate (0000) ───
const LINK_PWD = '0000';
let _pendingUrl = '';
function gatedLink(e, url, title) {
  e.preventDefault();
  _pendingUrl = url;
  const t = document.getElementById('link-modal-title');
  const i = document.getElementById('link-modal-input');
  const er = document.getElementById('link-modal-error');
  if (t) t.textContent = title || '確認身份';
  if (i) i.value = '';
  if (er) er.textContent = '';
  const m = document.getElementById('link-modal');
  if (m) m.classList.remove('hidden');
  setTimeout(() => { if (i) i.focus(); }, 100);
}
function closeLinkModal() {
  const m = document.getElementById('link-modal');
  if (m) m.classList.add('hidden');
  _pendingUrl = '';
}
function checkLinkGate() {
  const v = document.getElementById('link-modal-input').value;
  if (v === LINK_PWD) {
    closeLinkModal();
    window.open(_pendingUrl, '_blank');
  } else {
    const inp = document.getElementById('link-modal-input');
    document.getElementById('link-modal-error').textContent = '密碼錯誤';
    inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
    inp.value = ''; setTimeout(() => inp.focus(), 50);
  }
}
document.addEventListener('DOMContentLoaded', function () {
  const m = document.getElementById('link-modal');
  if (m) {
    m.addEventListener('click', function (e) {
      if (e.target === this) closeLinkModal();
    });
  }
});
