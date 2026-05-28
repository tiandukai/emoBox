// app.js - 肥纯专属情绪盒子 5 Tab 双人互动
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

  // ========== 状态 ==========
  let currentTab = 'record';
  let selectedTimelineMood = null;
  let notebookSegment = 'diary';
  let quoteEmotionIndex = 0;
  let diarySaveTimer = null;
  let timelineOffset = 0;
  const TIMELINE_PAGE = 20;
  let pendingDiaryPhotos = [];
  let pendingTimelinePhotos = [];

  // ========== 身份 ==========
  function getIdentity() {
    return sessionStorage.getItem('emoBox_identity') || 'feichun';
  }

  function setIdentity(id) {
    sessionStorage.setItem('emoBox_identity', id);
    updateIdentityUI();
  }

  function updateIdentityUI() {
    const badge = $('#identity-badge');
    const partnerNav = $('.nav-btn[data-tab="partner"]');
    const id = getIdentity();
    if (id === 'xiaopang') {
      badge.textContent = '当前是小胖 💝';
      badge.classList.add('xiaopang');
      partnerNav.classList.remove('hidden');
    } else {
      badge.textContent = '当前是肥纯 🥰';
      badge.classList.remove('xiaopang');
      partnerNav.classList.add('hidden');
      // 肥纯端如果在"我们"Tab，切回记录
      if (currentTab === 'partner') switchTab('record');
    }
  }

  function otherIdentity() {
    return getIdentity() === 'feichun' ? 'xiaopang' : 'feichun';
  }

  function showSwitchPasswordOverlay() {
    $('#switch-password-overlay').classList.remove('hidden');
    $('#switch-password-input').value = '';
    $('#switch-password-error').classList.add('hidden');
    setTimeout(() => $('#switch-password-input').focus(), 100);
  }

  function hideSwitchPasswordOverlay() {
    $('#switch-password-overlay').classList.add('hidden');
  }

  function confirmSwitch() {
    const input = $('#switch-password-input').value.trim();
    if (input === PARTNER_PASSWORD) {
      setIdentity('xiaopang');
      sessionStorage.setItem('partner_unlocked', 'true');
      hideSwitchPasswordOverlay();
      showToast('已切换为小胖 💝');
      if (currentTab === 'partner') initPartnerTab();
    } else {
      $('#switch-password-error').classList.remove('hidden');
      $('#switch-password-input').value = '';
    }
  }

  // ========== DOM ==========
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
  function todayStr() { return new Date().toISOString().split('T')[0]; }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`;
  }

  function formatMonth(year, month) {
    return `${year}年${month}月`;
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== 照片通用 ==========
  function setupPhotoInput(btnId, inputId, previewId, pendingArray) {
    const btn = $(btnId);
    const input = $(inputId);
    const preview = $(previewId);

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      const files = Array.from(input.files);
      console.log('[照片] 选择了', files.length, '个文件');
      files.forEach((f, i) => {
        console.log('[照片] 文件' + i + ':', f.name, f.type, (f.size / 1024).toFixed(1) + 'KB');
        pendingArray.push(f);
        renderPhotoPreview(preview, pendingArray);
      });
      input.value = '';
    });
  }

  function renderPhotoPreview(container, pendingArray) {
    container.innerHTML = pendingArray.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<div class="photo-thumb" data-index="${i}">
        <img src="${url}" alt="">
        <button class="photo-thumb-remove" data-index="${i}">✕</button>
      </div>`;
    }).join('');

    container.querySelectorAll('.photo-thumb-remove').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = parseInt(this.dataset.index);
        pendingArray.splice(idx, 1);
        renderPhotoPreview(container, pendingArray);
      });
    });
  }

  async function uploadPendingPhotos(pendingArray) {
    if (pendingArray.length === 0) {
      console.log('[照片] uploadPendingPhotos: 数组为空，跳过上传');
      return [];
    }
    console.log('[照片] 开始上传', pendingArray.length, '个文件');
    const results = [];
    for (let i = 0; i < pendingArray.length; i++) {
      const file = pendingArray[i];
      try {
        console.log('[照片] 上传中', i, file.name, file.type, file.size);
        const result = await db.uploadImage(file);
        console.log('[照片] 上传成功', i, 'URL:', result.url);
        results.push(result.url);
      } catch (e) {
        console.error('[照片] 上传失败', i, file.name, e);
        showToast('照片上传失败: ' + (e.message || '未知错误'));
      }
    }
    pendingArray.length = 0;
    console.log('[照片] 上传完成，共', results.length, '个URL');
    return results;
  }

  function renderSavedPhotos(container, urls) {
    container.innerHTML = urls.map(url => `
      <div class="photo-thumb">
        <img src="${url}" alt="" onclick="document.querySelector('#lightbox').classList.remove('hidden');document.querySelector('#lightbox-img').src='${url}'">
      </div>
    `).join('');
  }

  // ========== 情绪选择器渲染 ==========
  function renderEmotionSelector(containerId, selectedIndex, onClick) {
    const container = $(containerId);
    container.innerHTML = EMOTIONS.map((e, i) => `
      <button class="emo-btn ${selectedIndex === i ? 'selected' : ''}"
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
        const newVal = (selectedIndex === idx) ? null : idx;
        onClick(newVal);
        container.querySelectorAll('.emo-btn').forEach(b => b.classList.remove('selected'));
        if (newVal !== null) this.classList.add('selected');
      });
    });
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

    if (tab === 'record') initRecordTab();
    else if (tab === 'quotes') initQuotesTab();
    else if (tab === 'timeline') initTimelineTab();
    else if (tab === 'whispers') initWhispersTab();
    else if (tab === 'partner') initPartnerTab();
  }

  // ==================== 记录 Tab ====================
  async function initRecordTab() {
    $$('.segment-btn').forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`.segment-btn[data-segment="${notebookSegment}"]`);
    if (target) target.classList.add('active');

    $$('.segment-panel').forEach(p => p.classList.add('hidden'));
    if (notebookSegment === 'diary') {
      $('#segment-diary').classList.remove('hidden');
      loadDiaryList();
    } else {
      $('#segment-memo').classList.remove('hidden');
      loadMemoList();
    }
  }

  // 日记
  async function loadDiaryList() {
    try {
      const diaries = await db.getDiaries(getIdentity());
      const list = $('#diary-list');
      if (diaries.length === 0) {
        list.innerHTML = '<p class="empty-hint">还没有日记，点击下方开始记录</p>';
        return;
      }
      list.innerHTML = diaries.map(d => `
        <div class="diary-item" data-date="${d.date}" data-author="${d.author || 'feichun'}">
          <div class="diary-item-date">${formatDateFull(d.date)}</div>
          <div class="diary-item-preview">${d.note ? d.note.substring(0, 60) + (d.note.length > 60 ? '...' : '') : '（空白日记）'}</div>
        </div>
      `).join('');

      list.querySelectorAll('.diary-item').forEach(item => {
        item.addEventListener('click', function () {
          openDiaryEditor(this.dataset.date, this.dataset.author);
        });
      });
    } catch (e) { console.error('加载日记列表失败:', e); }
  }

  async function openDiaryEditor(date, author) {
    $('#diary-list').classList.add('hidden');
    $('#diary-new-btn').classList.add('hidden');
    $('#diary-editor').classList.remove('hidden');
    $('#diary-date-title').textContent = formatDateFull(date);

    const textarea = $('#diary-textarea');
    textarea.dataset.date = date;
    textarea.dataset.author = author || getIdentity();
    textarea.value = '';
    pendingDiaryPhotos = [];
    $('#diary-photo-preview').innerHTML = '';

    try {
      const diary = await db.getDiaryByDate(date, author || getIdentity());
      if (diary) {
        textarea.value = diary.note || '';
        if (diary.images && diary.images.length > 0) {
          renderSavedPhotos($('#diary-photo-preview'), diary.images);
        }
      }
    } catch (e) { console.error('加载日记失败:', e); }

    textarea.focus();

    textarea.addEventListener('input', function () {
      clearTimeout(diarySaveTimer);
      diarySaveTimer = setTimeout(async () => {
        try {
          const imageUrls = await uploadPendingPhotos(pendingDiaryPhotos);
          await db.upsertDiary(date, textarea.value, textarea.dataset.author, imageUrls);
          $('#diary-photo-preview').innerHTML = '';
          showToast('已自动保存');
        } catch (e) { console.error('自动保存日记失败:', e); }
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

  // 备忘录
  async function loadMemoList() {
    try {
      const memos = await db.getMemos(getIdentity());
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
          <button class="memo-check" aria-label="切换完成状态">${m.done ? '✅' : '○'}</button>
          <span class="memo-text">${escapeHtml(m.note)}</span>
          <button class="memo-delete" aria-label="删除">🗑️</button>
        </li>
      `).join('');

      list.querySelectorAll('.memo-check').forEach(btn => {
        btn.addEventListener('click', async function () {
          const li = this.closest('.memo-item');
          const isDone = li.classList.contains('done');
          await db.updateMemo(li.dataset.id, { done: !isDone });
          loadMemoList();
        });
      });

      list.querySelectorAll('.memo-delete').forEach(btn => {
        btn.addEventListener('click', async function () {
          await db.deleteMemo(this.closest('.memo-item').dataset.id);
          loadMemoList();
          showToast('已删除');
        });
      });
    } catch (e) { console.error('加载备忘录失败:', e); }
  }

  async function addMemo() {
    const input = $('#memo-input');
    const text = input.value.trim();
    if (!text) return;
    try {
      await db.addMemo(text, getIdentity());
      input.value = '';
      loadMemoList();
    } catch (e) {
      console.error('添加备忘录失败:', e);
      showToast('添加失败');
    }
  }

  // 分段切换
  function setupSegments() {
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
  }

  // ==================== 纸团 Tab ====================
  function initQuotesTab() {
    renderQuoteEmotionTabs();
    resetPaperBall();
  }

  function renderQuoteEmotionTabs() {
    const container = $('#quote-emotion-tabs');
    container.innerHTML = EMOTIONS.map((e, i) => `
      <button class="quote-emo-btn ${quoteEmotionIndex === i ? 'active' : ''}"
              data-index="${i}" style="--emo-color: ${e.color}">
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
    const quote = await db.getAvailableQuote(emotion.name, getIdentity());
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
      await db.markQuoteUsed(quote.id);
    }, 600);
  }

  // ==================== 时间轴 Tab ====================
  async function initTimelineTab() {
    selectedTimelineMood = null;
    timelineOffset = 0;
    renderEmotionSelector('#timeline-emotion-selector', selectedTimelineMood, (idx) => {
      selectedTimelineMood = idx;
    });
    $('#timeline-note-input').value = '';
    pendingTimelinePhotos = [];
    $('#timeline-photo-preview').innerHTML = '';
    await loadTimeline(true);
  }

  async function saveTimelineMood() {
    if (selectedTimelineMood === null) { showToast('请先选择一个心情哦'); return; }
    const note = $('#timeline-note-input').value.trim();
    const emotion = EMOTIONS[selectedTimelineMood];

    try {
      const imageUrls = await uploadPendingPhotos(pendingTimelinePhotos);
      console.log('[时间轴] upload返回URLs:', JSON.stringify(imageUrls));
      const saved = await db.saveRecord({
        date: todayStr(),
        mood: emotion.name,
        note,
        type: 'mood',
        author: getIdentity(),
        images: imageUrls
      });
      console.log('[时间轴] 保存结果 images:', JSON.stringify(saved?.images));
      playPaperPlane();
      showToast('已记录');
      // 重置表单并刷新
      selectedTimelineMood = null;
      $('#timeline-note-input').value = '';
      $('#timeline-photo-preview').innerHTML = '';
      renderEmotionSelector('#timeline-emotion-selector', null, (idx) => { selectedTimelineMood = idx; });
      await loadTimeline(true);
    } catch (e) {
      console.error('保存失败:', e);
      showToast('保存失败，请稍后再试');
    }
  }

  async function loadTimeline(reset) {
    if (reset) {
      timelineOffset = 0;
      $('#timeline-container').innerHTML = '';
    }

    const records = await db.getTimeline(TIMELINE_PAGE, timelineOffset);
    if (records.length === 0 && reset) {
      $('#timeline-container').innerHTML = '<p class="empty-hint">还没有记录，记录此刻的心情吧</p>';
      return;
    }

    const grouped = {};
    records.forEach(r => {
      const d = new Date(r.date);
      const key = formatMonth(d.getFullYear(), d.getMonth() + 1);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const container = $('#timeline-container');

    Object.keys(grouped).sort().reverse().forEach(month => {
      let monthHeader = container.querySelector(`[data-month="${month}"]`);
      if (!monthHeader) {
        monthHeader = document.createElement('div');
        monthHeader.className = 'timeline-month';
        monthHeader.dataset.month = month;
        monthHeader.textContent = month;
        container.appendChild(monthHeader);
      }

      grouped[month].forEach(r => {
        const card = document.createElement('div');
        card.className = 'timeline-card';

        const moodEmoji = r.mood ? (EMOTIONS.find(e => e.name === r.mood)?.emoji || '') : '';
        const timeStr = formatTime(r.created_at);
        const authorName = r.author === 'xiaopang' ? '💝 小胖' : '🥰 肥纯';
        const authorClass = r.author === 'xiaopang' ? 'xiaopang' : 'feichun';

        let imagesHtml = '';
        console.log('[时间轴] 渲染记录 images 字段:', r.images, 'type:', typeof r.images, 'isArray:', Array.isArray(r.images));
        if (r.images && r.images.length > 0) {
          imagesHtml = `<div class="timeline-images">${r.images.map(url =>
            `<img src="${url}" alt="" loading="lazy" onerror="console.log('[时间轴] 图片加载失败:', this.src)" onclick="document.getElementById('lightbox').classList.remove('hidden');document.getElementById('lightbox-img').src='${url}'">`
          ).join('')}</div>`;
        }

        card.innerHTML = `
          <div class="timeline-card-header">
            <span class="timeline-author ${authorClass}">${authorName}</span>
            <span class="timeline-type-badge">${moodEmoji} ${r.mood || ''}</span>
            <span class="timeline-time">${timeStr}</span>
          </div>
          <div class="timeline-card-body">
            ${r.note ? `<p class="timeline-note">${escapeHtml(r.note)}</p>` : ''}
            ${imagesHtml}
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
  }

  // ==================== 悄悄话 Tab ====================
  let whisperSub = null;

  async function initWhispersTab() {
    await loadWhispers();
    setupWhisperRealtime();
  }

  async function loadWhispers() {
    const list = $('#whisper-list');
    const whispers = await db.getWhispers(50);

    if (whispers.length === 0) {
      list.innerHTML = '<p class="empty-hint">还没有悄悄话，发一条吧</p>';
      return;
    }

    let html = '';
    let lastDate = '';
    whispers.forEach(w => {
      const dateStr = w.created_at ? w.created_at.split('T')[0] : '';
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        html += `<div class="whisper-date-divider">${formatDate(dateStr)}</div>`;
      }
      const emotionEmoji = EMOTIONS.find(e => e.name === w.emotion)?.emoji || '💬';
      html += `
        <div class="whisper-bubble ${w.sender}">
          <div class="whisper-bubble-emotion">${emotionEmoji}</div>
          <div>${escapeHtml(w.content)}</div>
          <div class="whisper-bubble-time">${formatTime(w.created_at)}</div>
        </div>
      `;
    });
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }

  function setupWhisperRealtime() {
    if (whisperSub) whisperSub.unsubscribe();
    whisperSub = db.subscribeToWhispers(payload => {
      if (currentTab === 'whispers') loadWhispers();
    });
  }

  async function sendWhisper() {
    const emotion = $('#whisper-emotion').value;
    const content = $('#whisper-input').value.trim();
    if (!content) return;

    try {
      await db.sendWhisper(getIdentity(), emotion, content);
      $('#whisper-input').value = '';
      await loadWhispers();
    } catch (e) {
      console.error('发送悄悄话失败:', e);
      showToast('发送失败');
    }
  }

  function renderWhisperEmotionSelect() {
    const select = $('#whisper-emotion');
    select.innerHTML = EMOTIONS.map(e => `<option value="${e.name}">${e.emoji}</option>`).join('');
  }

  // ==================== 我们 Tab ====================
  function initPartnerTab() {
    // 肥纯不能访问此 Tab（导航已隐藏，防御性检查）
    if (getIdentity() !== 'xiaopang') {
      switchTab('record');
      return;
    }
    if (sessionStorage.getItem('partner_unlocked') === 'true') {
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
  }

  function unlockPartner() {
    const input = $('#partner-password').value.trim();
    if (input === PARTNER_PASSWORD) {
      sessionStorage.setItem('partner_unlocked', 'true');
      setIdentity('xiaopang');
      $('#partner-error').classList.add('hidden');
      $('#partner-password').value = '';
      showPartnerContent();
      showToast('已切换为小胖身份');
    } else {
      $('#partner-error').classList.remove('hidden');
      $('#partner-password').value = '';
    }
  }

  function renderPartnerMoodSelect() {
    const select = $('#new-quote-mood');
    select.innerHTML = EMOTIONS.map(e => `<option value="${e.name}">${e.emoji} ${e.name}</option>`).join('');
  }

  async function handleAddQuote() {
    const mood = $('#new-quote-mood').value;
    const content = $('#new-quote-content').value.trim();
    if (!content) { showToast('请输入话语内容'); return; }
    try {
      await db.addQuote(mood, content, 'xiaopang');
      $('#new-quote-content').value = '';
      showToast('纸团已放入 🎁');
    } catch (e) {
      console.error('添加话语失败:', e);
      showToast('添加失败');
    }
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

  // ========== 灯箱 ==========
  function setupLightbox() {
    $('#lightbox').addEventListener('click', function () {
      this.classList.add('hidden');
    });
    $('.lightbox-close')?.addEventListener('click', function (e) {
      e.stopPropagation();
      $('#lightbox').classList.add('hidden');
    });
  }

  // ========== 初始化 ==========
  function init() {
    db.init();
    updateIdentityUI();
    setupTabs();
    setupSegments();
    setupNetworkDetection();
    setupLightbox();
    setupPhotoInput('#diary-photo-btn', '#diary-photo-input', '#diary-photo-preview', pendingDiaryPhotos);
    setupPhotoInput('#timeline-photo-btn', '#timeline-photo-input', '#timeline-photo-preview', pendingTimelinePhotos);

    // 记录 Tab
    $('#diary-new-btn').addEventListener('click', () => openDiaryEditor(todayStr(), getIdentity()));
    $('#diary-back-btn').addEventListener('click', closeDiaryEditor);
    $('#memo-add-btn').addEventListener('click', addMemo);
    $('#memo-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') addMemo(); });

    // 纸团 Tab
    $('#paper-ball').addEventListener('click', drawQuote);
    $('#quote-retry-btn').addEventListener('click', resetPaperBall);

    // 时间轴 Tab
    $('#timeline-save-btn').addEventListener('click', saveTimelineMood);
    $('#timeline-load-more').addEventListener('click', () => loadTimeline(false));

    // 悄悄话 Tab
    renderWhisperEmotionSelect();
    $('#whisper-send-btn').addEventListener('click', sendWhisper);
    $('#whisper-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendWhisper(); });

    // 我们 Tab
    $('#partner-unlock-btn').addEventListener('click', unlockPartner);
    $('#partner-password').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlockPartner(); });
    renderPartnerMoodSelect();
    $('#add-quote-btn').addEventListener('click', handleAddQuote);

    // 身份切换
    $('#identity-switch-btn').addEventListener('click', function () {
      if (getIdentity() === 'xiaopang') {
        setIdentity('feichun');
        sessionStorage.removeItem('partner_unlocked');
        showToast('已切回肥纯 🥰');
        if (currentTab === 'partner') initPartnerTab();
      } else {
        showSwitchPasswordOverlay();
      }
    });
    $('#switch-cancel-btn').addEventListener('click', hideSwitchPasswordOverlay);
    $('#switch-confirm-btn').addEventListener('click', confirmSwitch);
    $('#switch-password-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirmSwitch();
    });
    $('#switch-password-overlay').addEventListener('click', function (e) {
      if (e.target === this) hideSwitchPasswordOverlay();
    });

    // 启动
    initRecordTab();
    console.log('情绪盒子 5 Tab 双人互动版 已就绪');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
