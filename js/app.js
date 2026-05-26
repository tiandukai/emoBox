// app.js - 肥纯专属情绪盒子 主逻辑
(function () {
  'use strict';

  // ========== 情绪配置 ==========
  const EMOTIONS = [
    { emoji: '🥰', name: '幸福', color: '#FF6B8A', bg: '#FFF0F3' },
    { emoji: '😊', name: '开心', color: '#FFA726', bg: '#FFF8E1' },
    { emoji: '😴', name: '疲惫', color: '#B39DDB', bg: '#F3E5F5' },
    { emoji: '😢', name: '伤心', color: '#64B5F6', bg: '#E3F2FD' },
    { emoji: '😡', name: '生气', color: '#EF5350', bg: '#FFEBEE' },
    { emoji: '😰', name: '焦虑', color: '#AB47BC', bg: '#F3E5F5' }
  ];

  // ========== 应用状态 ==========
  let currentTab = 'mood';
  let selectedMood = null;
  let partnerUnlocked = false;

  // ========== DOM 引用 ==========
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // ========== Toast ==========
  function showToast(msg, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    $('#toast-container').appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ========== 纸飞机动画 ==========
  function playPaperPlane() {
    const layer = $('#paper-plane-layer');
    layer.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(30);
    setTimeout(() => layer.querySelector('.plane-text').classList.remove('hidden'), 800);
    setTimeout(() => {
      layer.classList.add('hidden');
      layer.querySelector('.plane-text').classList.add('hidden');
    }, 2500);
  }

  // ========== 日期工具 ==========
  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`;
  }

  // ========== 心情 Tab ==========
  async function initMoodTab() {
    renderEmotionSelector();
    await renderHeatmap();
    await loadTodayMood();
  }

  function renderEmotionSelector() {
    const container = $('#emotion-selector');
    container.innerHTML = EMOTIONS.map((e, i) => `
      <button class="emo-btn ${selectedMood === i ? 'selected' : ''}"
              data-index="${i}"
              style="--emo-color: ${e.color}; --emo-bg: ${e.bg}"
              aria-label="${e.name}">
        <span class="emo-emoji">${e.emoji}</span>
        <span class="emo-label">${e.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.emo-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index);
        selectedMood = (selectedMood === idx) ? null : idx;
        container.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        if (selectedMood !== null) this.classList.add('selected');
      });
    });
  }

  async function loadTodayMood() {
    try {
      const record = await db.getMoodByDate(todayStr());
      if (record) {
        const idx = EMOTIONS.findIndex(e => e.name === record.mood);
        if (idx >= 0) {
          selectedMood = idx;
          renderEmotionSelector();
        }
        $('#mood-note-input').value = record.note || '';
      }
    } catch (e) {
      console.error('加载今日心情失败:', e);
    }
  }

  async function renderHeatmap() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let moodMap = {};
    try {
      const records = await db.getMoodsInRange(startStr, endStr);
      records.forEach(r => { moodMap[r.date] = r.mood; });
    } catch (e) {
      console.error('加载热力图失败:', e);
    }

    const grid = $('#heatmap-grid');
    grid.innerHTML = '';

    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    days.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const moodName = moodMap[dateStr];
      const emotion = EMOTIONS.find(e => e.name === moodName);
      const bgColor = emotion ? emotion.color : '#E8E8E8';
      const tooltip = moodName
        ? `${formatDate(dateStr)} · ${moodName}`
        : formatDate(dateStr);

      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.backgroundColor = bgColor;
      cell.title = tooltip;
      cell.setAttribute('aria-label', tooltip);
      grid.appendChild(cell);
    });
  }

  async function saveMood() {
    if (selectedMood === null) {
      showToast('请先选择一个心情哦~');
      return;
    }
    const note = $('#mood-note-input').value.trim();
    const emotion = EMOTIONS[selectedMood];

    try {
      await db.saveRecord({ date: todayStr(), mood: emotion.name, note, type: 'mood' });
      playPaperPlane();
      showToast('心情已记录 ✨');
      await renderHeatmap();
    } catch (e) {
      console.error('保存失败:', e);
      showToast('保存失败，请稍后再试');
    }
  }

  // ========== 纸团 Tab ==========
  let quoteEmotionIndex = 0;

  function initQuotesTab() {
    renderQuoteEmotionTabs();
    resetPaperBall();
  }

  function renderQuoteEmotionTabs() {
    const container = $('#quote-emotion-tabs');
    container.innerHTML = EMOTIONS.map((e, i) => `
      <button class="quote-emo-btn ${quoteEmotionIndex === i ? 'active' : ''}"
              data-index="${i}"
              style="--emo-color: ${e.color}">
        ${e.emoji} ${e.name}
      </button>
    `).join('');

    container.querySelectorAll('.quote-emo-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        quoteEmotionIndex = parseInt(this.dataset.index);
        container.querySelectorAll('.quote-emo-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        resetPaperBall();
      });
    });
  }

  function resetPaperBall() {
    $('#paper-ball').classList.remove('hidden', 'opening');
    $('#paper-result').classList.add('hidden');
    $('#quotes-empty-msg').classList.add('hidden');
  }

  async function drawQuote() {
    const emotion = EMOTIONS[quoteEmotionIndex];
    let quote;
    try {
      quote = await db.getAvailableQuote(emotion.name);
    } catch (e) {
      console.error('获取话语失败:', e);
      showToast('获取失败，请稍后再试');
      return;
    }

    if (!quote) {
      $('#paper-ball').classList.add('hidden');
      $('#paper-result').classList.add('hidden');
      $('#quotes-empty-msg').classList.remove('hidden');
      return;
    }

    const ball = $('#paper-ball');
    ball.classList.add('opening');

    setTimeout(async () => {
      ball.classList.add('hidden');
      const result = $('#paper-result');
      result.classList.remove('hidden');
      $('#paper-content').textContent = quote.content;
      result.classList.add('reveal');

      try { await db.markQuoteUsed(quote.id); }
      catch (e) { console.error('标记话语失败:', e); }
    }, 600);
  }

  // ========== 小本 Tab ==========
  let notebookSegment = 'diary';
  let diarySaveTimer = null;

  function initNotebookTab() {
    $('#segment-diary').classList.remove('hidden');
    $('#segment-memo').classList.add('hidden');
    $$('.segment-btn').forEach(b => b.classList.remove('active'));
    const diaryBtn = document.querySelector('.segment-btn[data-segment="diary"]');
    if (diaryBtn) diaryBtn.classList.add('active');
    notebookSegment = 'diary';
    loadDiaryList();
    loadMemoList();
  }

  // ==================== 日记 ====================

  async function loadDiaryList() {
    try {
      const diaries = await db.getDiaries();
      const list = $('#diary-list');
      if (diaries.length === 0) {
        list.innerHTML = '<p class="empty-hint">还没有日记，点击下方开始记录</p>';
        return;
      }
      list.innerHTML = diaries.map(d => `
        <div class="diary-item" data-date="${d.date}">
          <div class="diary-item-date">${formatDateFull(d.date)}</div>
          <div class="diary-item-preview">${d.note ? d.note.substring(0, 60) + (d.note.length > 60 ? '...' : '') : '（空白日记）'}</div>
        </div>
      `).join('');

      list.querySelectorAll('.diary-item').forEach(item => {
        item.addEventListener('click', function () {
          openDiaryEditor(this.dataset.date);
        });
      });
    } catch (e) {
      console.error('加载日记列表失败:', e);
    }
  }

  async function openDiaryEditor(date) {
    $('#diary-list').classList.add('hidden');
    $('#diary-new-btn').classList.add('hidden');
    $('#diary-editor').classList.remove('hidden');
    $('#diary-date-title').textContent = formatDateFull(date);

    const textarea = $('#diary-textarea');
    textarea.dataset.date = date;
    textarea.value = '';

    try {
      const diary = await db.getDiaryByDate(date);
      if (diary) textarea.value = diary.note || '';
    } catch (e) {
      console.error('加载日记失败:', e);
    }

    textarea.focus();

    textarea.addEventListener('input', function () {
      clearTimeout(diarySaveTimer);
      diarySaveTimer = setTimeout(async () => {
        try {
          await db.upsertDiary(date, textarea.value);
          showToast('已自动保存 📝');
        } catch (e) {
          console.error('自动保存日记失败:', e);
        }
      }, 2000);
    });
  }

  function closeDiaryEditor() {
    clearTimeout(diarySaveTimer);
    $('#diary-editor').classList.add('hidden');
    $('#diary-list').classList.remove('hidden');
    $('#diary-new-btn').classList.remove('hidden');
    loadDiaryList();
  }

  // ==================== 备忘录 ====================

  async function loadMemoList() {
    try {
      const memos = await db.getMemos();
      const list = $('#memo-list');
      if (memos.length === 0) {
        list.innerHTML = '<li class="memo-empty">还没有待办事项</li>';
        return;
      }

      const active = memos.filter(m => !m.done);
      const done = memos.filter(m => m.done);
      const sorted = [...active, ...done];

      list.innerHTML = sorted.map(m => `
        <li class="memo-item ${m.done ? 'done' : ''}" data-id="${m.id}">
          <button class="memo-check ${m.done ? 'checked' : ''}" aria-label="切换完成状态">
            ${m.done ? '✅' : '○'}
          </button>
          <span class="memo-text">${escapeHtml(m.note)}</span>
          <button class="memo-delete" aria-label="删除">🗑️</button>
        </li>
      `).join('');

      list.querySelectorAll('.memo-check').forEach(btn => {
        btn.addEventListener('click', async function () {
          const li = this.closest('.memo-item');
          const id = li.dataset.id;
          const isDone = li.classList.contains('done');
          try {
            await db.updateMemo(id, { done: !isDone });
            loadMemoList();
          } catch (e) {
            console.error('更新备忘录失败:', e);
          }
        });
      });

      list.querySelectorAll('.memo-delete').forEach(btn => {
        btn.addEventListener('click', async function () {
          const id = this.closest('.memo-item').dataset.id;
          try {
            await db.deleteMemo(id);
            loadMemoList();
            showToast('已删除');
          } catch (e) {
            console.error('删除备忘录失败:', e);
          }
        });
      });
    } catch (e) {
      console.error('加载备忘录失败:', e);
    }
  }

  async function addMemo() {
    const input = $('#memo-input');
    const text = input.value.trim();
    if (!text) return;
    try {
      await db.addMemo(text);
      input.value = '';
      loadMemoList();
    } catch (e) {
      console.error('添加备忘录失败:', e);
      showToast('添加失败，请稍后再试');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== 伴侣 Tab ==========
  let timelineOffset = 0;
  const TIMELINE_PAGE = 20;
  let realtimeSubscription = null;

  function initPartnerTab() {
    if (sessionStorage.getItem('partner_unlocked') === 'true') {
      partnerUnlocked = true;
      showPartnerContent();
    } else {
      showPartnerGate();
    }
  }

  function showPartnerGate() {
    $('#partner-gate').classList.remove('hidden');
    $('#partner-content').classList.add('hidden');
  }

  function showPartnerContent() {
    $('#partner-gate').classList.add('hidden');
    $('#partner-content').classList.remove('hidden');
    loadTimeline(true);
    loadQuoteInventory();
  }

  function unlockPartner() {
    const input = $('#partner-password').value.trim();
    if (input === PARTNER_PASSWORD) {
      partnerUnlocked = true;
      sessionStorage.setItem('partner_unlocked', 'true');
      $('#partner-error').classList.add('hidden');
      $('#partner-password').value = '';
      showPartnerContent();
    } else {
      $('#partner-error').classList.remove('hidden');
      $('#partner-password').value = '';
    }
  }

  // ==================== 时间线 ====================

  async function loadTimeline(reset = true) {
    if (reset) timelineOffset = 0;
    try {
      const records = await db.getTimeline(TIMELINE_PAGE, timelineOffset);
      const container = $('#timeline-container');

      if (reset) container.innerHTML = '';

      if (records.length === 0 && reset) {
        container.innerHTML = '<p class="empty-hint">还没有记录，等待她的第一条心情~</p>';
        return;
      }

      const grouped = {};
      records.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push(r);
      });

      Object.keys(grouped).sort().reverse().forEach(date => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'timeline-date';
        dateHeader.textContent = formatDateFull(date);
        container.appendChild(dateHeader);

        grouped[date].forEach(r => {
          const card = document.createElement('div');
          card.className = 'timeline-card';
          const typeLabel = r.type === 'mood' ? '心情' : r.type === 'diary' ? '日记' : '备忘';
          const emoji = r.type === 'mood' ? (EMOTIONS.find(e => e.name === r.mood)?.emoji || '') : '';
          const timeStr = r.created_at ? new Date(r.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';

          card.innerHTML = `
            <div class="timeline-card-header">
              <span class="timeline-type-badge">${emoji} ${typeLabel}</span>
              <span class="timeline-time">${timeStr}</span>
            </div>
            <div class="timeline-card-body">
              ${r.mood ? `<p class="timeline-mood">${EMOTIONS.find(e => e.name === r.mood)?.emoji || ''} ${r.mood}</p>` : ''}
              ${r.note ? `<p class="timeline-note">${escapeHtml(r.note)}</p>` : ''}
            </div>
          `;
          container.appendChild(card);
        });
      });

      timelineOffset += records.length;
      if (records.length === TIMELINE_PAGE) {
        $('#timeline-load-more').classList.remove('hidden');
      } else {
        $('#timeline-load-more').classList.add('hidden');
      }
    } catch (e) {
      console.error('加载时间线失败:', e);
    }
  }

  // ==================== 纸团库存 ====================

  async function loadQuoteInventory() {
    try {
      const inventory = await db.getQuoteInventory();
      const container = $('#quote-inventory');
      container.innerHTML = EMOTIONS.map(e => {
        const stats = inventory[e.name] || { total: 0, remaining: 0 };
        const pct = stats.total > 0 ? Math.round(stats.remaining / stats.total * 100) : 0;
        return `
          <div class="inventory-row">
            <span class="inventory-emoji">${e.emoji}</span>
            <span class="inventory-name">${e.name}</span>
            <div class="inventory-bar">
              <div class="inventory-fill" style="width:${pct}%; background:${e.color}"></div>
            </div>
            <span class="inventory-count">${stats.remaining}/${stats.total}</span>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('加载纸团库存失败:', e);
    }
  }

  function renderQuoteMoodSelect() {
    const select = $('#new-quote-mood');
    select.innerHTML = EMOTIONS.map(e => `
      <option value="${e.name}">${e.emoji} ${e.name}</option>
    `).join('');
  }

  async function handleAddQuote() {
    const mood = $('#new-quote-mood').value;
    const content = $('#new-quote-content').value.trim();
    if (!content) {
      showToast('请输入话语内容~');
      return;
    }
    try {
      await db.addQuote(mood, content);
      $('#new-quote-content').value = '';
      showToast('纸团已放入 🎁');
      loadQuoteInventory();
    } catch (e) {
      console.error('添加话语失败:', e);
      showToast('添加失败，请稍后再试');
    }
  }

  // ========== 初始化 ==========
  function init() {
    db.init();
    setupTabs();
    setupNetworkDetection();

    // 分段控制器
    $$('.segment-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        notebookSegment = this.dataset.segment;
        $$('.segment-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        $$('.segment-panel').forEach(p => p.classList.add('hidden'));
        if (notebookSegment === 'diary') {
          $('#segment-diary').classList.remove('hidden');
          loadDiaryList();
        } else {
          $('#segment-memo').classList.remove('hidden');
          loadMemoList();
        }
      });
    });

    // 心情保存
    $('#mood-save-btn').addEventListener('click', saveMood);

    // 纸团
    $('#paper-ball').addEventListener('click', drawQuote);
    $('#quote-retry-btn').addEventListener('click', resetPaperBall);

    // 日记
    $('#diary-new-btn').addEventListener('click', () => openDiaryEditor(todayStr()));
    $('#diary-back-btn').addEventListener('click', closeDiaryEditor);

    // 备忘录
    $('#memo-add-btn').addEventListener('click', addMemo);
    $('#memo-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addMemo();
    });

    // 伴侣
    $('#partner-unlock-btn').addEventListener('click', unlockPartner);
    $('#partner-password').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') unlockPartner();
    });
    $('#timeline-load-more').addEventListener('click', () => loadTimeline(false));
    renderQuoteMoodSelect();
    $('#add-quote-btn').addEventListener('click', handleAddQuote);

    // 启动
    initMoodTab();
    console.log('肥纯专属情绪盒子 ❤️ 已就绪');
  }

  // ========== Tab 切换 ==========
  function setupTabs() {
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        switchTab(this.dataset.tab);
      });
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    $$('.tab-content').forEach(s => s.classList.add('hidden'));
    $(`#tab-${tab}`).classList.remove('hidden');
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    $(`.nav-btn[data-tab="${tab}"]`).classList.add('active');

    if (tab === 'mood') initMoodTab();
    else if (tab === 'quotes') initQuotesTab();
    else if (tab === 'notebook') initNotebookTab();
    else if (tab === 'partner') initPartnerTab();
  }

  // ========== 网络检测 ==========
  function setupNetworkDetection() {
    function updateStatus() {
      const bar = $('#network-status');
      if (navigator.onLine) bar.classList.add('hidden');
      else bar.classList.remove('hidden');
    }
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
