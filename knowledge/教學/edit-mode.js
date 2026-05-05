/* ============================================================
   編輯模式（共用）
   manager-prologue + manager-training
   主公點 ✏️ 進入 → 文字塊可改 → 改完一鍵複製改動清單
   localStorage 自動暫存、重整不會丟
   ============================================================ */
(() => {
  // 只在這三頁啟用
  const allowedPages = ['manager-prologue', 'manager-training', 'manager-starter-pack'];
  const pageKey = (location.pathname.match(/manager-(prologue|training|starter-pack)/) || [])[0];
  if (!pageKey) return;

  // 注入 CSS
  const css = `
    .em-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9998;
      background: #1E293B;
      color: white;
      border: none;
      border-radius: 30px;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
      transition: all 0.2s;
    }
    .em-fab:hover { background: #5BC8D5; }
    .em-fab.is-on { background: #5BC8D5; }
    .em-toolbar {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 9998;
      background: white;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      gap: 8px;
      min-width: 220px;
      border: 1px solid #E2E8F0;
    }
    .em-toolbar.is-on { display: flex; }
    .em-toolbar button {
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #1E293B;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
      font-family: inherit;
    }
    .em-toolbar button:hover {
      background: #F8FDFE;
      border-color: #5BC8D5;
    }
    .em-toolbar button.primary {
      background: #5BC8D5;
      color: white;
      border-color: #5BC8D5;
    }
    .em-toolbar button.primary:hover {
      background: #2AABBB;
    }
    .em-toolbar button.danger {
      color: #B91C1C;
    }
    .em-toolbar .em-stat {
      font-size: 11px;
      color: #64748B;
      padding: 4px 4px;
      border-bottom: 1px solid #F1F5F9;
      margin-bottom: 4px;
    }
    .em-toolbar .em-stat strong {
      color: #1E293B;
    }
    .em-fmt-bar {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #F1F5F9;
      margin-bottom: 4px;
    }
    .em-fmt-bar button {
      padding: 5px 10px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      min-width: 32px;
      text-align: center !important;
    }
    .em-fmt-bar select {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 5px 6px;
      font-size: 12px;
      font-weight: 600;
      color: #1E293B;
      background: white;
      cursor: pointer;
      font-family: inherit;
      flex: 1;
    }
    .em-fmt-bar select:focus {
      outline: none;
      border-color: #5BC8D5;
    }
    body.em-active .em-editable {
      outline: 1px dashed transparent;
      outline-offset: 2px;
      cursor: text;
      transition: outline 0.15s, background 0.15s;
      border-radius: 4px;
      caret-color: #5BC8D5;
      padding: 2px 4px;
      margin-left: -4px;
      margin-right: -4px;
      /* IME 友善：注音組字框會貼近游標 */
      ime-mode: active;
    }
    body.em-active .em-editable:hover {
      outline: 1px dashed #5BC8D5;
      background: rgba(91,200,213,0.06);
    }
    body.em-active .em-editable:focus {
      outline: 2px solid #5BC8D5;
      background: rgba(91,200,213,0.12);
      /* 編輯時行高與字距拉開、好讀好打 */
      line-height: 1.95;
      letter-spacing: 0.02em;
    }
    body.em-active .em-editable.is-changed {
      background: rgba(245,158,11,0.08);
      outline: 1px solid rgba(245,158,11,0.4);
    }
    body.em-active .em-editable.is-composing {
      background: rgba(91,200,213,0.18);
      outline: 2px solid #2AABBB;
    }
    .em-toast {
      position: fixed;
      bottom: 80px;
      right: 24px;
      background: #1E293B;
      color: white;
      padding: 14px 22px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: em-toast-in 0.2s ease;
    }
    @keyframes em-toast-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // 注入按鈕
  const fab = document.createElement('button');
  fab.className = 'em-fab';
  fab.innerHTML = '<span>✏️</span><span>編輯模式</span>';
  document.body.appendChild(fab);

  const toolbar = document.createElement('div');
  toolbar.className = 'em-toolbar';
  toolbar.innerHTML = `
    <div class="em-stat" id="em-stat">尚未進入編輯</div>
    <div class="em-fmt-bar" id="em-fmt-bar">
      <button data-fmt="bold" title="粗體 Cmd+B"><strong>B</strong></button>
      <button data-fmt="underline" title="底線 Cmd+U"><u>U</u></button>
      <select id="em-font-size" title="字體大小">
        <option value="">字體大小</option>
        <option value="1">小</option>
        <option value="3">正常</option>
        <option value="5">大</option>
        <option value="7">超大</option>
      </select>
    </div>
    <button class="primary" data-act="save-online">🚀 儲存上線（一鍵）</button>
    <button data-act="copy">📋 複製改動清單</button>
    <button data-act="export-html">💾 下載完整 HTML</button>
    <button class="danger" data-act="reset">↩️ 全部還原</button>
    <button data-act="clear-storage">🗑 清空暫存</button>
  `;
  document.body.appendChild(toolbar);

  // 可編輯的選擇器（main 內、排除 nav/footer/script/style）
  const EDITABLE_SEL = [
    'main p',
    'main h1', 'main h2', 'main h3', 'main h4', 'main h5',
    'main li',
    'main .ch-num', 'main .ch-label', 'main .section-label', 'main .section-sub',
    'main .compare-eyebrow', 'main .callout-title', 'main .callout-desc',
    'main .timeline-date', 'main .timeline-title', 'main .timeline-desc',
    'main .stat-number', 'main .stat-label',
    'main .pull-quote', 'main .pull-quote-cite',
    'main .compare-col h4',
    'main .greeting', 'main .signature',
    'main h2 + p', 'main h3 + p', 'main h4 + p',
    'main blockquote', 'main blockquote cite',
    'main td', 'main th',
    'main figcaption',
    // manager-starter-pack 專用
    'main .hero-badge', 'main .hero-sub',
    'main .foreword-body', 'main .foreword-sig', 'main .foreword-title',
    'main .foreword-sig-info',
    'main .stat-num', 'main .stat-label',
    'main .agent-role-label', 'main .agent-card-info',
    'main .step-num',
    'main .faq-question', 'main .faq-answer',
    'main .habit-card',
    'main .chat-bubble',
    'main .prompt-text',
    'main .row-label',
    'main .callout-box',
    'main .back-banner-left',
    'main .footer-cta',
    'main .code-block',
    'main .section-divider',
    'main .compare-table td', 'main .compare-table th',
    'main .confidential-banner',
  ].join(', ');

  // localStorage key
  const LS_KEY = `em-edits-${pageKey}`;

  function getStorage() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function setStorage(obj) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {}
  }

  // 為每個可編輯元素產生穩定 id（用內容 hash + index）
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h<<5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  let elements = [];
  let active = false;

  function collectElements() {
    elements = Array.from(document.querySelectorAll(EDITABLE_SEL));
    // 過濾：排除已有子可編輯（避免巢狀）+ 排除空文字
    elements = elements.filter(el => {
      const txt = el.textContent.trim();
      if (!txt) return false;
      // 如果父層已被列入、跳過子層（避免巢狀編輯）
      let p = el.parentElement;
      while (p && p !== document.body) {
        if (elements.includes(p) && p !== el) {
          // 留父、剃子（除非很短的子標籤）
          if (txt.length < 30) return true; // 短的當子可改
        }
        p = p.parentElement;
      }
      return true;
    });
    // 給每個元素一個 stable index
    elements.forEach((el, i) => {
      el.dataset.emIdx = i;
      if (!el.dataset.emOriginal) {
        el.dataset.emOriginal = el.innerHTML;
      }
    });
  }

  function applyStoredEdits() {
    const store = getStorage();
    elements.forEach((el, i) => {
      const v = store[i];
      if (v && v !== el.innerHTML) {
        el.innerHTML = v;
        el.classList.add('is-changed');
      }
    });
    updateStat();
  }

  // IME composition 狀態（每個元素獨立）
  const composingMap = new WeakMap();

  function enterEdit() {
    collectElements();
    document.body.classList.add('em-active');
    elements.forEach(el => {
      el.classList.add('em-editable');
      el.contentEditable = 'true';
      el.spellcheck = false;
      // 注音組字事件
      el.addEventListener('compositionstart', onCompStart);
      el.addEventListener('compositionend', onCompEnd);
      el.addEventListener('input', onInput);
      el.addEventListener('blur', onBlur);
    });
    applyStoredEdits();
    fab.classList.add('is-on');
    fab.innerHTML = '<span>✏️</span><span>結束編輯</span>';
    toolbar.classList.add('is-on');
    active = true;
    updateStat();
  }

  function exitEdit() {
    document.body.classList.remove('em-active');
    elements.forEach(el => {
      el.classList.remove('em-editable', 'is-composing');
      el.contentEditable = 'false';
      el.removeEventListener('compositionstart', onCompStart);
      el.removeEventListener('compositionend', onCompEnd);
      el.removeEventListener('input', onInput);
      el.removeEventListener('blur', onBlur);
    });
    fab.classList.remove('is-on');
    fab.innerHTML = '<span>✏️</span><span>編輯模式</span>';
    toolbar.classList.remove('is-on');
    active = false;
  }

  function onCompStart(e) {
    // 注音開始組字
    composingMap.set(e.currentTarget, true);
    e.currentTarget.classList.add('is-composing');
  }

  function onCompEnd(e) {
    // 注音選字完成
    composingMap.set(e.currentTarget, false);
    e.currentTarget.classList.remove('is-composing');
    // 組字完才寫一次 localStorage
    persistChange(e.currentTarget);
  }

  function onInput(e) {
    const el = e.currentTarget;
    // 組字中不寫 storage、不更新 stat（避免吃掉組字內容）
    if (composingMap.get(el)) return;
    persistChange(el);
  }

  function onBlur(e) {
    // 失焦時保險寫一次
    if (composingMap.get(e.currentTarget)) return;
    persistChange(e.currentTarget);
  }

  function persistChange(el) {
    const i = el.dataset.emIdx;
    const store = getStorage();
    if (el.innerHTML === el.dataset.emOriginal) {
      delete store[i];
      el.classList.remove('is-changed');
    } else {
      store[i] = el.innerHTML;
      el.classList.add('is-changed');
    }
    setStorage(store);
    updateStat();
  }

  function updateStat() {
    const changed = elements.filter(el => el.classList.contains('is-changed')).length;
    document.getElementById('em-stat').innerHTML =
      `共 <strong>${elements.length}</strong> 段可改 / <strong>${changed}</strong> 段已改動`;
  }

  // 純文字版（去 HTML）
  function plain(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.replace(/\s+/g, ' ').trim();
  }

  // 複製改動清單到剪貼簿（markdown）
  function copyChanges() {
    const changes = elements
      .filter(el => el.classList.contains('is-changed'))
      .map(el => ({
        idx: el.dataset.emIdx,
        tag: el.tagName.toLowerCase(),
        section: el.closest('section')?.id || '(top)',
        before: plain(el.dataset.emOriginal),
        after: plain(el.innerHTML),
      }));
    if (changes.length === 0) {
      toast('沒有改動可複製');
      return;
    }
    let md = `# ${pageKey} 改動清單（共 ${changes.length} 處）\n\n`;
    md += `_主公在編輯模式裡改的、請韓信同步到原始檔_\n\n`;
    changes.forEach((c, i) => {
      md += `## ${i+1}. <${c.tag}> @ #${c.section}\n\n`;
      md += `**改前：**\n> ${c.before}\n\n`;
      md += `**改後：**\n> ${c.after}\n\n`;
      md += `---\n\n`;
    });
    navigator.clipboard.writeText(md)
      .then(() => toast(`已複製 ${changes.length} 處改動、貼給韓信即可`))
      .catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = md;
        document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        toast(`已複製 ${changes.length} 處改動`);
      });
  }

  // 取得乾淨的完整 HTML（清掉編輯模式痕跡）
  function getCleanHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.em-editable, .em-editable.is-changed, .is-composing').forEach(el => {
      el.classList.remove('em-editable', 'is-changed', 'is-composing');
    });
    clone.querySelectorAll('.em-fab, .em-toolbar, .em-toast').forEach(el => el.remove());
    clone.querySelectorAll('[data-em-idx], [data-em-original], [spellcheck]').forEach(el => {
      el.removeAttribute('data-em-idx');
      el.removeAttribute('data-em-original');
      el.removeAttribute('spellcheck');
    });
    // 清掉 chip 「已讀」回到「標記已讀」
    clone.querySelectorAll('.ch-chip.done').forEach(el => {
      el.classList.remove('done');
      el.textContent = '標記已讀';
    });
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  // 一鍵儲存上線
  async function saveOnline() {
    const changed = elements.filter(el => el.classList.contains('is-changed')).length;
    if (changed === 0) {
      toast('沒有改動可儲存');
      return;
    }
    if (!confirm(`真的要把 ${changed} 處改動推上 production？\n約 1-2 分鐘後 reyway.com 會生效、所有人都看得到。`)) return;

    toast('儲存中、別關頁面⋯⋯');

    try {
      const html = getCleanHtml();
      const res = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pageKey,
          html,
          message: `[edit-mode] 主公更新 ${pageKey} (${changed} 處)`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(`❌ 儲存失敗：${data.error || res.statusText}`);
        return;
      }
      // 成功
      toast(`✅ 已 commit、約 ${data.estimatedSeconds || 90} 秒後上線`);
      // 清 localStorage、避免重整套用舊改動
      setStorage({});
      // 把 dataset.emOriginal 更新成新版本（避免本頁面 stat 還顯示「已改動」）
      elements.forEach(el => {
        el.dataset.emOriginal = el.innerHTML;
        el.classList.remove('is-changed');
      });
      updateStat();
      // 退出編輯模式
      setTimeout(() => {
        if (active) exitEdit();
        toast('🌳 production 應該已上線、可以重整看看');
      }, 90000);
    } catch (e) {
      toast(`❌ 網路錯誤：${e.message}`);
    }
  }

  // 下載完整 HTML
  function exportFullHtml() {
    const html = getCleanHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageKey}.edited.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已下載 .edited.html');
  }

  // 全部還原
  function resetAll() {
    if (!confirm('確定要把所有改動還原？暫存也會清空。')) return;
    elements.forEach(el => {
      el.innerHTML = el.dataset.emOriginal;
      el.classList.remove('is-changed');
    });
    setStorage({});
    updateStat();
    toast('已還原所有改動');
  }

  function clearStorage() {
    if (!confirm('清空 localStorage 暫存？頁面內容保留。')) return;
    setStorage({});
    toast('暫存已清空');
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'em-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // 格式工具：toolbar 按鈕
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    const fmt = btn.dataset.fmt;
    if (act) {
      if (act === 'save-online') saveOnline();
      if (act === 'copy') copyChanges();
      if (act === 'export-html') exportFullHtml();
      if (act === 'reset') resetAll();
      if (act === 'clear-storage') clearStorage();
    }
    if (fmt && active) {
      document.execCommand(fmt === 'bold' ? 'bold' : 'underline', false, null);
    }
  });

  // 格式工具：字體大小 select
  toolbar.addEventListener('change', (e) => {
    if (e.target.id === 'em-font-size' && active) {
      const val = e.target.value;
      if (val) {
        document.execCommand('fontSize', false, val);
        e.target.value = ''; // 重設回佔位符
      }
    }
  });

  // 格式工具：鍵盤快捷鍵（Cmd+B / Cmd+U）
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false, null);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      document.execCommand('underline', false, null);
    }
  });

  // 事件
  fab.addEventListener('click', () => {
    if (active) exitEdit();
    else enterEdit();
  });

  // 偵測有沒有 stored edits、提示主公
  window.addEventListener('DOMContentLoaded', () => {
    const store = getStorage();
    if (Object.keys(store).length > 0) {
      // 有暫存、自動提示
      setTimeout(() => {
        toast(`有 ${Object.keys(store).length} 處未提交改動、點 ✏️ 繼續編輯`);
      }, 800);
    }
  });
})();
