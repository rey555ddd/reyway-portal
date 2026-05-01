// reyway.com 編輯模式（主公專用、密碼啟用）
// 流程：
//   1. 任何訪客載入時都會 fetch /api/text、把主公的覆寫值套到頁面
//   2. 主公在右下角點「編輯模式」 → 第一次跳密碼輸入 → 對的話啟用
//   3. ON 時 [data-edit-id] 變 contenteditable、blur 自動 PUT
//   4. 點「鎖定 / 關閉」 → 退出編輯模式（密碼仍記住、下次點一鍵切換）
//   5. 想完全登出主公身份：點按鈕時按住 Shift（清 localStorage）

const OWNER_TOKEN = 'sheng0429'; // 主公密碼（前端弱擋，後端 PUT 也會再驗一次）
const STORAGE_KEY = 'reyway_owner_token';

function isMaster() {
  return localStorage.getItem(STORAGE_KEY) === OWNER_TOKEN;
}

function setMaster(yes) {
  if (yes) localStorage.setItem(STORAGE_KEY, OWNER_TOKEN);
  else localStorage.removeItem(STORAGE_KEY);
}

// ── 1. 載入 KV 覆寫（任何訪客都套、看到主公最新版）──
async function loadOverrides() {
  try {
    const r = await fetch('/api/text');
    if (!r.ok) return;
    const { items = {} } = await r.json();
    for (const [key, text] of Object.entries(items)) {
      const el = document.querySelector(`[data-edit-id="${key}"]`);
      if (el && typeof text === 'string') el.innerHTML = text;
    }
  } catch (e) {
    console.warn('[edit-mode] loadOverrides failed:', e);
  }
}

// ── 2. 切換編輯模式 ──
function setEditMode(on) {
  const body = document.body;
  const btn = document.getElementById('edit-toggle');
  const txt = document.getElementById('edit-toggle-text');
  if (!btn) return;

  if (on) {
    body.classList.add('edit-on');
    btn.classList.add('editing');
    if (txt) txt.textContent = '鎖定 · 關閉';
    document.querySelectorAll('[data-edit-id]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.spellcheck = false;
    });
  } else {
    body.classList.remove('edit-on');
    btn.classList.remove('editing');
    if (txt) txt.textContent = '編輯模式';
    document.querySelectorAll('[data-edit-id]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.blur();
    });
  }
}

// ── 3. 儲存（失焦觸發、800ms debounce）──
const saveTimers = new Map();
function saveText(el) {
  const key = el.getAttribute('data-edit-id');
  if (!key) return;
  const text = el.innerHTML.trim();
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(async () => {
    try {
      const r = await fetch('/api/text', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Token': OWNER_TOKEN,
        },
        body: JSON.stringify({ key, text }),
      });
      if (!r.ok) throw new Error('save failed: ' + r.status);
      showToast('已儲存 ✓');
    } catch (e) {
      console.error('[edit-mode] save failed:', e);
      showToast('儲存失敗 · ' + e.message, true);
    }
  }, 800));
}

// ── 4. Toast ──
function showToast(msg, isErr = false) {
  const t = document.getElementById('edit-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isErr ? '#A14E2F' : '#1A1A1A';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ── 5. 啟動 ──
async function init() {
  // 載入 KV 覆寫（任何訪客都載）
  await loadOverrides();

  const btn = document.getElementById('edit-toggle');
  if (!btn) return;

  // 編輯按鈕一直顯示（不管登入身份）
  btn.classList.add('show');

  // 重整後預設 OFF
  let editing = false;

  btn.addEventListener('click', (e) => {
    // Shift+click = 登出主公身份
    if (e.shiftKey && isMaster()) {
      setMaster(false);
      if (editing) { editing = false; setEditMode(false); }
      showToast('已退出主公身份');
      return;
    }

    // 還沒輸入過密碼、跳 prompt
    if (!isMaster()) {
      const pwd = prompt('輸入主公編輯密碼');
      if (!pwd) return;
      if (pwd !== OWNER_TOKEN) {
        showToast('密碼錯誤', true);
        return;
      }
      setMaster(true);
      showToast('已啟用主公身份');
    }

    // 切換 ON / OFF
    editing = !editing;
    setEditMode(editing);
  });

  // 為每個可編元素掛失焦 + 鍵盤快捷（含 IME composition 防護）
  document.querySelectorAll('[data-edit-id]').forEach(el => {
    let isComposing = false;
    el.addEventListener('compositionstart', () => { isComposing = true; });
    el.addEventListener('compositionend', () => {
      // 給瀏覽器一個 tick 把 commit 字符塞進來
      setTimeout(() => { isComposing = false; }, 0);
    });
    el.addEventListener('blur', () => {
      if (document.body.classList.contains('edit-on')) saveText(el);
    });
    el.addEventListener('keydown', (e) => {
      // ⛔ IME 組字中（新注音 / Pinyin / 日文 等）忽略所有快捷鍵
      // e.isComposing 是標準屬性、keyCode 229 是 IME 觸發 keydown 的特徵
      if (e.isComposing || isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
      if (e.key === 'Escape') {
        clearTimeout(saveTimers.get(el.getAttribute('data-edit-id')));
        el.blur();
        showToast('已取消');
      }
    });
  });

  // ⛔ 編輯模式下、所有 <a> click 全部擋掉（避免點卡片跳走）
  document.body.addEventListener('click', (e) => {
    if (!document.body.classList.contains('edit-on')) return;
    const a = e.target.closest('a');
    if (a) {
      e.preventDefault();
      e.stopPropagation();
      // 視覺提示：tooltip
      showToast('編輯模式中、連結已停用');
    }
  }, true); // useCapture = true、最早攔截
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
