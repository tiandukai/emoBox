// app.js - 给对方的情绪盒子 5 Tab 双人互动
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
  let currentTab = 'home';
  let selectedTimelineMood = null;
  let notebookSegment = 'diary';
  let quoteEmotionIndex = 0;
  let diarySaveTimer = null;
  let timelineOffset = 0;
  const TIMELINE_PAGE = 20;
  let pendingDiaryPhotos = [];
  let pendingTimelinePhotos = [];

  // ========== 身份（Auth）==========
  let authUser = null;
  let myProfile = null;
  let mySpace = null;
  let partnerProfile = null;

  function getIdentity() {
    return myProfile?.nickname || 'feichun';
  }

  function getUserId() {
    return authUser?.id || null;
  }

  function isLoggedIn() {
    return !!authUser;
  }

  async function initAuth() {
    try {
      authUser = await db.getUser();
    } catch (e) {
      authUser = null;
    }
    if (authUser) {
      db.setUserId(authUser.id);
      await reloadProfile();
    }
    updateAuthUI();
    db.onAuthChange(async (event, user) => {
      authUser = user;
      if (user) {
        db.setUserId(user.id);
        await reloadProfile();
        if (currentTab === 'partner' && !partnerProfile) switchTab('record');
      } else {
        myProfile = null;
        mySpace = null;
        partnerProfile = null;
        db.setUserId(null);
        updateAuthUI();
        showAuthPage('login');
        return;
      }
      updateAuthUI();
    });
  }

  let _reloadingProfile = false;

  async function reloadProfile() {
    if (!authUser) return;
    if (_reloadingProfile) return;
    _reloadingProfile = true;
    try {
      myProfile = await db.getProfile(authUser.id);
      console.log('[Profile] getProfile:', myProfile);
      if (!myProfile) {
        // 新用户自动创建 profile（默认昵称=邮箱前缀，后续可在设置修改）
        const nickname = (authUser.email || 'user').split('@')[0];
        myProfile = await db.createProfile(authUser.id, nickname);
        console.log('[Profile] createProfile:', myProfile);
      }
      // 确保有邀请码
      if (!myProfile?.invite_code) {
        const code = await db.getMyInviteCode(authUser.id);
        console.log('[Profile] 生成邀请码:', code);
        myProfile = await db.getProfile(authUser.id);
      }
      console.log('[Profile] 最终 profile:', myProfile);
      // 加载空间信息
      mySpace = null;
      partnerProfile = null;
      if (myProfile?.space_id) {
        mySpace = await db.getSpace(myProfile.space_id);
        partnerProfile = await db.getPartnerProfile(myProfile.space_id, authUser.id);
      }
      console.log('[Profile] space:', mySpace, 'partner:', partnerProfile);
    } catch (e) {
      console.error('[Profile] reloadProfile 出错:', e);
    } finally {
      _reloadingProfile = false;
    }
  }

  function isPaired() {
    return !!(mySpace?.partner_id && partnerProfile);
  }

  function updateAuthUI() {
    const btn = $('#identity-switch-btn');
    if (!btn) return;
    if (authUser) {
      btn.textContent = myProfile?.nickname || authUser.email;
      btn.classList.add('logged-in');
      $('#auth-menu-logout').classList.remove('hidden');
      $('#auth-menu-invite').classList.remove('hidden');
      if (isPaired()) {
        $('#auth-menu-invite').textContent = '已配对 💑';
      } else {
        $('#auth-menu-invite').textContent = '邀请码: ' + (myProfile?.invite_code || '—');
      }
    } else {
      btn.textContent = '登录';
      btn.classList.remove('logged-in');
      $('#auth-menu-logout').classList.add('hidden');
      $('#auth-menu-invite').classList.add('hidden');
    }

    // Tab 可见性：未登录隐藏"我们"；未配对隐藏"记录/纸团/时间轴/悄悄话"
    const paired = isPaired();
    const partnerNav = $('.nav-btn[data-tab="partner"]');
    if (partnerNav) partnerNav.classList.toggle('hidden', !isLoggedIn());
    ['record', 'quotes', 'timeline', 'whispers'].forEach(t => {
      const nav = $(`.nav-btn[data-tab="${t}"]`);
      if (nav) nav.classList.toggle('hidden', !paired);
    });

    // 如果当前 Tab 被隐藏了，切回首页
    if (!paired && ['record', 'quotes', 'timeline', 'whispers'].includes(currentTab)) {
      switchTab('home');
    }
  }

  function showAuthPage(mode) {
    mode = mode || 'login';
    $('#auth-page').classList.remove('hidden');
    $('#app').classList.add('hidden');
    $('.bottom-nav').classList.add('hidden');
    $('#auth-email').value = '';
    $('#auth-password').value = '';
    $('#auth-error').classList.add('hidden');
    $('#auth-page').dataset.mode = mode;
    if (mode === 'login') {
      $('#auth-submit').textContent = '登录';
      $('.auth-switch').innerHTML = '还没有账号？<button id="auth-switch-link">立即注册</button>';
    } else {
      $('#auth-submit').textContent = '注册';
      $('.auth-switch').innerHTML = '已有账号？<button id="auth-switch-link">立即登录</button>';
    }
    document.getElementById('auth-switch-link')?.addEventListener('click', () => {
      showAuthPage(mode === 'login' ? 'register' : 'login');
    });
  }

  function hideAuthPage() {
    $('#auth-page').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('.bottom-nav').classList.remove('hidden');
  }

  async function handleAuthSubmit() {
    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;
    if (!email || !password) {
      $('#auth-error').textContent = '请填写邮箱和密码';
      $('#auth-error').classList.remove('hidden');
      return;
    }
    $('#auth-error').classList.add('hidden');
    $('#auth-submit').disabled = true;
    $('#auth-submit').textContent = '处理中...';
    try {
      const mode = $('#auth-page').dataset.mode || 'login';
      if (mode === 'login') {
        await db.signIn(email, password);
        showToast('登录成功');
        hideAuthPage();
        await initAuth();
        // 登录后默认显示"去配对"引导页面
        switchTab('partner');
      } else {
        await db.signUp(email, password);
        await db.signOut();
        showToast('注册成功，请登录');
        showAuthPage('login');
      }
    } catch (e) {
      $('#auth-error').textContent = e.message || '操作失败，请重试';
      $('#auth-error').classList.remove('hidden');
    }
    $('#auth-submit').disabled = false;
    $('#auth-submit').textContent = $('#auth-page').dataset.mode === 'login' ? '登录' : '注册';
  }

  async function handleLogout() {
    if (!confirm('确定退出登录？')) return;
    // 清理 Realtime 订阅
    if (whisperSub) { whisperSub.unsubscribe(); whisperSub = null; }
    if (timelineSub) { timelineSub.unsubscribe(); timelineSub = null; }
    if (rrSub) { rrSub.unsubscribe(); rrSub = null; }
    rrSubscribed = false;
    await db.signOut();
    authUser = null;
    myProfile = null;
    mySpace = null;
    partnerProfile = null;
    db.setUserId(null);
    updateAuthUI();
    showToast('已退出');
    showAuthPage('login');
  }

  // 空间创建/加入
  function showSpaceSetupModal() {
    $('#space-modal').classList.remove('hidden');
    $('#space-error').classList.add('hidden');
  }

  function hideSpaceModal() {
    $('#space-modal').classList.add('hidden');
  }

  async function handleCreateSpace() {
    const nickname = $('#space-nickname').value.trim() || '用户';
    $('#space-error').classList.add('hidden');
    try {
      const space = await db.createSpace(authUser.id, nickname);
      await reloadProfile();
      updateAuthUI();
      hideSpaceModal();
      showToast('空间创建成功，邀请码: ' + space.invite_code);
    } catch (e) {
      $('#space-error').textContent = e.message || '创建失败';
      $('#space-error').classList.remove('hidden');
    }
  }

  async function handleJoinSpace() {
    const code = $('#space-invite-code').value.trim();
    if (!code) {
      $('#space-error').textContent = '请输入邀请码';
      $('#space-error').classList.remove('hidden');
      return;
    }
    try {
      await db.joinSpace(authUser.id, code);
      await reloadProfile();
      updateAuthUI();
      hideSpaceModal();
      showToast('配对成功 💑');
    } catch (e) {
      $('#space-error').textContent = e.message || '加入失败';
      $('#space-error').classList.remove('hidden');
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
    // 未配对不能进入记录/时间轴/悄悄话
    if (['record', 'quotes', 'timeline', 'whispers'].includes(tab) && !isPaired()) {
      tab = 'home';
      showToast('请先配对后再使用此功能');
    }
    currentTab = tab;
    sessionStorage.setItem('emoBox_tab', tab);
    $$('.tab-content').forEach(s => s.classList.add('hidden'));
    $(`#tab-${tab}`).classList.remove('hidden');
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    $(`.nav-btn[data-tab="${tab}"]`).classList.add('active');

    // 切换按钮显示控制
    const switchBtn = $('#identity-switch-btn');
    if (tab === 'record') switchBtn.classList.remove('hidden');
    else switchBtn.classList.add('hidden');

    stopTimelinePolling();
    if (tab === 'home') initHomeTab();
    else if (tab === 'record') initRecordTab();
    else if (tab === 'quotes') initQuotesTab();
    else if (tab === 'timeline') initTimelineTab();
    else if (tab === 'whispers') initWhispersTab();
    else if (tab === 'partner') initPartnerTab();
  }

  // ==================== 首页 Tab ====================
  function animateDaysCount(target) {
    const el = $('#home-days-count');
    if (!el) return;
    const start = 0;
    const duration = 1200;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initHomeTab() {
    if (!isLoggedIn()) {
      $('#home-unpaired').classList.remove('hidden');
      $('#home-paired').classList.add('hidden');
      return;
    }

    if (mySpace?.partner_id && partnerProfile) {
      // 已配对 → 显示在一起天数
      $('#home-unpaired').classList.add('hidden');
      $('#home-paired').classList.remove('hidden');

      $('#home-name-me').textContent = myProfile?.nickname || '我';
      $('#home-name-partner').textContent = partnerProfile?.nickname || 'TA';

      if (mySpace.anniversary_date) {
        const start = new Date(mySpace.anniversary_date);
        const today = new Date();
        const days = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
        animateDaysCount(days);
      } else {
        $('#home-days-count').textContent = '♥';
      }
    } else {
      // 已登录但未配对
      $('#home-unpaired').classList.remove('hidden');
      $('#home-paired').classList.add('hidden');
    }
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
    const quote = await db.getAvailableQuote(emotion.name);
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
  let timelineSortAsc = false;
  let pendingTimelinePhoto = null;

  function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            if (width > maxWidth) { newHeight = Math.round(height * maxWidth / width); newWidth = maxWidth; }
          } else {
            if (height > maxHeight) { newWidth = Math.round(width * maxHeight / height); newHeight = maxHeight; }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.getContext('2d').drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  let timelinePollTimer = null;
  let timelineLastCount = 0;

  function startTimelinePolling() {
    stopTimelinePolling();
    timelinePollTimer = setInterval(async () => {
      try {
        const count = await db.getTimelineEventCount();
        if (count !== timelineLastCount) {
          timelineLastCount = count;
          await loadTimeline(true);
        }
      } catch (e) { /* polling silently fails */ }
    }, 30000);
  }

  function stopTimelinePolling() {
    if (timelinePollTimer) { clearInterval(timelinePollTimer); timelinePollTimer = null; }
  }

  async function initTimelineTab() {
    timelineOffset = 0;
    const dateInput = $('#timeline-date-input');
    if (!dateInput.value) dateInput.value = todayStr();
    pendingTimelinePhoto = null;
    $('#timeline-photo-preview').innerHTML = '';
    setupTimelineRealtime();
    await loadTimeline(true);
    timelineLastCount = parseInt($('#timeline-event-count').textContent) || 0;
    startTimelinePolling();
  }

  function toggleTimelineSort() {
    timelineSortAsc = !timelineSortAsc;
    const btn = $('#timeline-sort-btn');
    btn.textContent = timelineSortAsc ? '最新在前' : '最早在前';
    loadTimeline(true);
  }

  async function loadTimeline(reset) {
    if (reset) {
      timelineOffset = 0;
      $('#timeline-container').innerHTML = '';
    }

    let events;
    try {
      events = await db.getTimelineEvents(TIMELINE_PAGE, timelineOffset);
    } catch (e) {
      console.error('[时间轴] 加载失败:', e);
      showToast('加载失败: ' + (e.message || '未知错误'));
      if (reset) {
        $('#timeline-container').innerHTML = '<p class="timeline-empty">加载失败，请下拉刷新</p>';
      }
      return;
    }

    // 如果默认降序，需要在前端反转（数据库始终按 date DESC 查，再反转）
    const sorted = timelineSortAsc ? [...events].reverse() : events;

    if (sorted.length === 0 && reset) {
      $('#timeline-container').innerHTML = '<p class="timeline-empty">还没有共同回忆，来记录第一条吧</p>';
      $('#timeline-event-count').textContent = '0 个共同回忆';
      return;
    }

    // 按月份分组
    const grouped = new Map();
    sorted.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(e);
    });

    const container = $('#timeline-container');
    if (reset) container.innerHTML = '';

    const monthKeys = timelineSortAsc ? [...grouped.keys()] : [...grouped.keys()].reverse();

    monthKeys.forEach(month => {
      // 月份标签
      const label = document.createElement('div');
      label.className = 'timeline-month-label';
      label.textContent = month;
      container.appendChild(label);

      const events = grouped.get(month);
      (timelineSortAsc ? events : [...events].reverse()).forEach(e => {
        const d = new Date(e.date);
        const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
        const locationStr = [e.city, e.place].filter(Boolean).join(' · ');

        const wrapper = document.createElement('div');
        wrapper.className = 'timeline-event';
        wrapper.dataset.id = e.id;

        let imageHtml = '';
        if (e.image) {
          imageHtml = `<img src="${e.image}" alt="" class="timeline-event-image" loading="lazy"
            onclick="document.getElementById('lightbox').classList.remove('hidden');document.getElementById('lightbox-img').src='${e.image}'">`;
        }

        let noteHtml = '';
        if (e.note) {
          noteHtml = `<div class="timeline-event-note">${escapeHtml(e.note)}</div>`;
        }
        let locationHtml = '';
        if (locationStr) {
          locationHtml = `<div class="timeline-event-location">${escapeHtml(locationStr)}</div>`;
        }

        wrapper.innerHTML = `
          <div class="timeline-event-dot"></div>
          <div class="timeline-event-card">
            <div class="timeline-event-header">
              <div class="timeline-event-date">${dateStr}</div>
              <div class="timeline-event-actions">
                <button class="timeline-event-edit" data-id="${e.id}" title="编辑">✏️</button>
                <button class="timeline-event-delete" data-id="${e.id}" title="删除">🗑️</button>
              </div>
            </div>
            ${noteHtml}
            ${locationHtml}
            ${e.image ? imageHtml : ''}
          </div>
        `;
        container.appendChild(wrapper);

        // 编辑按钮
        wrapper.querySelector('.timeline-event-edit').addEventListener('click', function () {
          startEditTimelineEvent(this.dataset.id);
        });
        // 删除按钮
        wrapper.querySelector('.timeline-event-delete').addEventListener('click', function () {
          deleteTimelineEvent(this.dataset.id);
        });
      });
    });

    timelineOffset += sorted.length;
    if (sorted.length === TIMELINE_PAGE) {
      $('#timeline-load-more').classList.remove('hidden');
    } else {
      $('#timeline-load-more').classList.add('hidden');
    }

    // 更新计数
    updateTimelineCount();
  }

  async function updateTimelineCount() {
    try {
      const count = await db.getTimelineEventCount();
      $('#timeline-event-count').textContent = `${count} 个共同回忆`;
    } catch (e) { /* ignore */ }
  }

  function buildTimelineCardHTML({ date, city, place, note, imageUrl, previewUrl }) {
    const d = new Date(date);
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    const locationStr = [city, place].filter(Boolean).join(' · ');
    let imageHtml = '';
    if (imageUrl || previewUrl) {
      const src = previewUrl || imageUrl;
      imageHtml = `<img src="${src}" alt="" class="timeline-event-image" loading="lazy">`;
    }
    let noteHtml = '';
    if (note) { noteHtml = `<div class="timeline-event-note">${escapeHtml(note)}</div>`; }
    let locationHtml = '';
    if (locationStr) { locationHtml = `<div class="timeline-event-location">${escapeHtml(locationStr)}</div>`; }
    return `
      <div class="timeline-event-dot"></div>
      <div class="timeline-event-card">
        <div class="timeline-event-date">${dateStr}</div>
        ${noteHtml}
        ${locationHtml}
        ${imageHtml}
        <div class="timeline-event-status">保存中...</div>
      </div>`;
  }

  function insertTimelineCard(wrapper, date) {
    const d = new Date(date);
    const monthKey = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    const container = $('#timeline-container');
    const emptyEl = container.querySelector('.timeline-empty');
    if (emptyEl) emptyEl.remove();
    const labels = container.querySelectorAll('.timeline-month-label');
    for (const label of labels) {
      if (label.textContent === monthKey) {
        label.insertAdjacentElement('afterend', wrapper);
        return;
      }
    }
    const monthLabel = document.createElement('div');
    monthLabel.className = 'timeline-month-label';
    monthLabel.textContent = monthKey;
    container.insertBefore(monthLabel, container.firstChild);
    container.insertBefore(wrapper, monthLabel.nextSibling);
  }

  async function saveTimelineEvent() {
    const dateInput = $('#timeline-date-input');
    const cityInput = $('#timeline-city-input');
    const placeInput = $('#timeline-place-input');
    const noteInput = $('#timeline-note-input');

    const date = dateInput.value;
    const city = cityInput.value.trim();
    const place = placeInput.value.trim();
    const note = noteInput.value.trim();

    if (!date) { showToast('请选择日期'); return; }
    if (!note && !city && !place) { showToast('请至少填写事情描述或地点'); return; }

    const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const photo = pendingTimelinePhoto;
    const previewUrl = photo ? URL.createObjectURL(photo) : null;

    // 乐观插入 DOM
    const wrapper = document.createElement('div');
    wrapper.className = 'timeline-event timeline-event-pending';
    wrapper.id = tempId;
    wrapper.innerHTML = buildTimelineCardHTML({ date, city, place, note, previewUrl });
    insertTimelineCard(wrapper, date);

    // 重置表单
    cityInput.value = '';
    placeInput.value = '';
    noteInput.value = '';
    pendingTimelinePhoto = null;
    $('#timeline-photo-preview').innerHTML = '';

    playPaperPlane();
    showToast('已记录');

    // 后台异步保存
    try {
      let imageUrl = null;
      if (photo) {
        const compressed = await compressImage(photo);
        const uploadResult = await db.uploadImage(compressed);
        imageUrl = uploadResult.url;
      }

      const saved = await db.addTimelineEvent({
        date, city, place, note,
        image: imageUrl,
        author: getIdentity()
      });

      // 成功：更新 DOM
      const el = document.getElementById(tempId);
      if (el) {
        el.classList.remove('timeline-event-pending');
        const statusEl = el.querySelector('.timeline-event-status');
        if (statusEl) {
          const btn = document.createElement('button');
          btn.className = 'timeline-event-delete';
          btn.dataset.id = saved.id;
          btn.textContent = '删除';
          btn.addEventListener('click', function () { deleteTimelineEvent(this.dataset.id); });
          statusEl.replaceWith(btn);
        }
        if (imageUrl && previewUrl && imageUrl !== previewUrl) {
          const img = el.querySelector('.timeline-event-image');
          if (img) img.src = imageUrl;
        }
        updateTimelineCount();
      }
    } catch (e) {
      console.error('[时间轴] 后台保存失败:', e);
      const el = document.getElementById(tempId);
      if (el) {
        el.classList.remove('timeline-event-pending');
        el.classList.add('timeline-event-failed');
        const statusEl = el.querySelector('.timeline-event-status');
        if (statusEl) { statusEl.textContent = '保存失败'; }
      }
      updateTimelineCount();
    }
  }

  async function deleteTimelineEvent(id) {
    if (!confirm('确定删除这条回忆吗？')) return;
    try {
      await db.deleteTimelineEvent(id);
      showToast('已删除');
      await loadTimeline(true);
    } catch (e) {
      console.error('[时间轴] 删除失败:', e);
      showToast('删除失败');
    }
  }

  // 编辑时间轴事件
  async function startEditTimelineEvent(id) {
    const wrapper = $(`.timeline-event[data-id="${id}"]`);
    if (!wrapper) return;
    const card = wrapper.querySelector('.timeline-event-card');
    if (!card) return;

    // 从数据库获取最新数据
    const events = await db.getTimelineEvents(100, 0);
    const event = events.find(e => e.id === id);
    if (!event) { showToast('记录不存在'); return; }

    card.innerHTML = `
      <div class="tl-edit-field">
        <label>日期</label>
        <input type="date" class="tl-edit-date" value="${event.date}">
      </div>
      <div class="tl-edit-row">
        <div class="tl-edit-field">
          <label>城市</label>
          <input type="text" class="tl-edit-city" value="${escapeHtml(event.city || '')}" placeholder="城市">
        </div>
        <div class="tl-edit-field">
          <label>地点</label>
          <input type="text" class="tl-edit-place" value="${escapeHtml(event.place || '')}" placeholder="地点">
        </div>
      </div>
      <div class="tl-edit-field">
        <label>描述</label>
        <textarea class="tl-edit-note" rows="2" placeholder="记录...">${escapeHtml(event.note || '')}</textarea>
      </div>
      <div class="tl-edit-btns">
        <button class="tl-edit-cancel">取消</button>
        <button class="tl-edit-save">保存</button>
      </div>
    `;

    // 取消 → 重新加载恢复原样
    card.querySelector('.tl-edit-cancel').addEventListener('click', () => loadTimeline(true));

    // 保存
    card.querySelector('.tl-edit-save').addEventListener('click', async () => {
      const updates = {
        date: card.querySelector('.tl-edit-date').value,
        city: card.querySelector('.tl-edit-city').value.trim(),
        place: card.querySelector('.tl-edit-place').value.trim(),
        note: card.querySelector('.tl-edit-note').value.trim(),
      };
      if (!updates.date) { showToast('请选择日期'); return; }
      try {
        await db.updateTimelineEvent(id, updates);
        showToast('已更新');
        playPaperPlane();
        await loadTimeline(true);
      } catch (e) {
        console.error('[时间轴] 更新失败:', e);
        showToast('更新失败');
      }
    });
  }

  // 时间轴照片选择
  function setupTimelinePhoto() {
    const btn = $('#timeline-photo-btn');
    const input = $('#timeline-photo-input');
    const preview = $('#timeline-photo-preview');

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      if (input.files.length > 0) {
        pendingTimelinePhoto = input.files[0];
        const url = URL.createObjectURL(pendingTimelinePhoto);
        preview.innerHTML = `<div class="photo-thumb">
          <img src="${url}" alt="">
          <button class="photo-thumb-remove" id="timeline-photo-remove">✕</button>
        </div>`;
        $('#timeline-photo-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          pendingTimelinePhoto = null;
          preview.innerHTML = '';
          input.value = '';
        });
        input.value = '';
      }
    });
  }

  // ==================== 悄悄话 Tab ====================
  let whisperSub = null;
  let timelineSub = null;
  let rrSub = null;

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
      const isSent = w.sender === (myProfile?.nickname || '');
      const senderLabel = isSent ? '' : `<div class="whisper-bubble-sender">${escapeHtml(partnerProfile?.nickname || 'TA')}</div>`;
      html += `
        <div class="whisper-bubble ${isSent ? 'sent' : 'received'}">
          ${senderLabel}
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

  function setupTimelineRealtime() {
    if (timelineSub) timelineSub.unsubscribe();
    timelineSub = db.subscribeToTimelineEvents(payload => {
      if (currentTab === 'timeline') {
        timelineLastCount = parseInt($('#timeline-event-count').textContent) + 1 || 0;
        loadTimeline(true);
      }
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

  // ==================== 复制邀请码 ====================
  function copyInviteCode() {
    const code = $('#my-invite-code')?.textContent || $('#my-invite-code-paired')?.textContent;
    if (!code || code === '———') return;
    navigator.clipboard.writeText(code).then(() => {
      showToast('已复制邀请码');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('已复制邀请码');
    });
  }

  // ==================== 我们 Tab ====================
  // ========== 我们 Tab — 恋爱请求配对 ==========
  let partnerSearchResult = null;
  let partnerRequests = [];
  let rrSubscribed = false;

  async function initPartnerTab() {
    if (!isLoggedIn()) {
      showToast('请先登录');
      switchTab('record');
      return;
    }

    // 刷新个人信息（可能配对刚被接受）
    await reloadProfile();

    // 显示昵称
    const nickname = myProfile?.nickname || '用户';
    if ($('#my-nickname')) $('#my-nickname').textContent = nickname;
    if ($('#my-nickname-unpaired')) $('#my-nickname-unpaired').textContent = nickname;

    // 显示头像
    const avatarUrl = myProfile?.avatar_url;
    const avatarPaired = $('#my-avatar-paired');
    const avatarUnpaired = $('#my-avatar-unpaired');

    if (avatarUrl) {
      if (avatarPaired) {
        avatarPaired.style.backgroundImage = `url(${avatarUrl})`;
        avatarPaired.style.backgroundSize = 'cover';
        avatarPaired.style.backgroundPosition = 'center';
        avatarPaired.textContent = '';
      }
      if (avatarUnpaired) {
        avatarUnpaired.style.backgroundImage = `url(${avatarUrl})`;
        avatarUnpaired.style.backgroundSize = 'cover';
        avatarUnpaired.style.backgroundPosition = 'center';
        avatarUnpaired.textContent = '';
      }
    } else {
      if (avatarPaired) {
        avatarPaired.style.backgroundImage = '';
        avatarPaired.textContent = '💞';
      }
      if (avatarUnpaired) {
        avatarUnpaired.style.backgroundImage = '';
        avatarUnpaired.textContent = '👤';
      }
    }

    // 已配对的显示配对信息
    if (mySpace?.partner_id && partnerProfile) {
      $('#partner-paired').classList.remove('hidden');
      $('#partner-unpaired').classList.add('hidden');
      // 回填纪念日
      if (mySpace.anniversary_date) {
        $('#anniversary-date-input').value = mySpace.anniversary_date;
      }
      // 显示邀请码
      try {
        const code = await db.getMyInviteCode(authUser.id);
        if ($('#my-invite-code-paired')) $('#my-invite-code-paired').textContent = code;
      } catch (e) {
        if ($('#my-invite-code-paired')) $('#my-invite-code-paired').textContent = '获取中...';
      }
      return;
    }

    // 未配对 — 显示配对界面
    $('#partner-paired').classList.add('hidden');
    $('#partner-unpaired').classList.remove('hidden');

    // 加载我的邀请码
    try {
      const code = await db.getMyInviteCode(authUser.id);
      $('#my-invite-code').textContent = code;
    } catch (e) {
      $('#my-invite-code').textContent = '获取中...';
    }

    // 加载待处理的请求
    await loadPendingRequests();
    // 加载已发送请求状态
    await loadSentRequests();

    // 订阅实时请求通知
    if (!rrSubscribed) {
      rrSubscribed = true;
      rrSub = db.subscribeToRelationshipRequests(authUser.id, (req) => {
        showToast('收到新的恋爱请求！');
        loadPendingRequests();
      });
    }
  }

  // 搜索对方的邀请码
  async function searchPartner() {
    const code = $('#partner-search-input').value.trim();
    if (!code) {
      $('#partner-search-error').textContent = '请输入邀请码';
      $('#partner-search-error').classList.remove('hidden');
      return;
    }
    $('#partner-search-error').classList.add('hidden');
    $('#partner-search-result').classList.add('hidden');
    $('#partner-search-btn').disabled = true;
    $('#partner-search-btn').textContent = '搜索中...';

    try {
      const result = await db.searchByInviteCode(code);
      if (result.id === authUser.id) {
        $('#partner-search-error').textContent = '这是你自己的邀请码哦';
        $('#partner-search-error').classList.remove('hidden');
        return;
      }
      partnerSearchResult = result;
      $('#partner-result-name').textContent = result.nickname || '未知用户';
      $('#partner-result-code').textContent = '邀请码: ' + result.invite_code;
      $('#partner-search-result').classList.remove('hidden');
      // 清除之前的已发送状态
      $('#partner-sent-status').classList.add('hidden');
      $('#partner-sent-status').innerHTML = '';
    } catch (e) {
      $('#partner-search-error').textContent = e.message || '未找到该用户';
      $('#partner-search-error').classList.remove('hidden');
      partnerSearchResult = null;
    } finally {
      $('#partner-search-btn').disabled = false;
      $('#partner-search-btn').textContent = '搜索';
    }
  }

  // 发送恋爱请求
  async function sendRelationshipRequest() {
    if (!partnerSearchResult) return;
    try {
      await db.sendRelationshipRequest(authUser.id, partnerSearchResult.id);
      $('#partner-search-result').classList.add('hidden');
      showToast('恋爱请求已发送');
      await loadSentRequests();
    } catch (e) {
      showToast(e.message || '发送失败');
    }
  }

  // 加载发给我的请求
  async function loadPendingRequests() {
    const container = $('#partner-incoming-requests');
    const sentContainer = $('#partner-sent-status');
    try {
      const requests = await db.getPendingRequests(authUser.id);
      partnerRequests = requests;
      if (requests.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        // 如果有已发送的请求，不清除
        return;
      }

      container.classList.remove('hidden');
      container.innerHTML = '<p class="partner-incoming-title">收到的恋爱请求</p>' +
        requests.map(r => {
          const nickname = r.profiles?.nickname || '未知用户';
          return `
            <div class="incoming-request-card">
              <div class="incoming-request-info">
                <p class="incoming-request-from">${escapeHtml(nickname)}</p>
                <p class="incoming-request-label">想和你建立恋爱关系</p>
              </div>
              <div class="incoming-request-actions">
                <button class="btn-accept" data-accept="${r.id}">同意</button>
                <button class="btn-reject" data-reject="${r.id}">拒绝</button>
              </div>
            </div>`;
        }).join('');

      // 绑定事件
      container.querySelectorAll('[data-accept]').forEach(btn => {
        btn.addEventListener('click', () => handleAcceptRequest(btn.dataset.accept));
      });
      container.querySelectorAll('[data-reject]').forEach(btn => {
        btn.addEventListener('click', () => handleRejectRequest(btn.dataset.reject));
      });
    } catch (e) {
      console.error('加载请求失败:', e);
    }
  }

  // 加载我发出的请求状态
  async function loadSentRequests() {
    const container = $('#partner-sent-status');
    try {
      const sent = await db.getMySentRequests(authUser.id);
      const pendingSent = sent.filter(r => r.status === 'pending');
      if (pendingSent.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
      }
      container.classList.remove('hidden');
      container.innerHTML = pendingSent.map(r => {
        const name = r.profiles?.nickname || '未知用户';
        return `<div class="partner-sent-status">
          <p class="partner-sent-text">已向 ${escapeHtml(name)} 发送恋爱请求</p>
          <p class="partner-sent-sub">等待对方回应...</p>
        </div>`;
      }).join('');
    } catch (e) {
      // 静默处理
    }
  }

  // 同意请求
  async function handleAcceptRequest(requestId) {
    try {
      await db.acceptRequest(requestId, authUser.id);
      await reloadProfile();
      updateAuthUI();
      showToast('配对成功 💑');
      // 隐藏请求列表
      $('#partner-incoming-requests').classList.add('hidden');
      $('#partner-sent-status').classList.add('hidden');
      // 重新加载此 Tab
      initPartnerTab();
    } catch (e) {
      showToast(e.message || '操作失败');
    }
  }

  // 拒绝请求
  async function handleRejectRequest(requestId) {
    if (!confirm('确定拒绝这个请求吗？')) return;
    try {
      await db.rejectRequest(requestId, authUser.id);
      showToast('已拒绝');
      await loadPendingRequests();
    } catch (e) {
      showToast(e.message || '操作失败');
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
      await db.addQuote(mood, content, getIdentity());
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
  async function init() {
    // 关键事件监听——必须绑定，不能因后续报错丢失
    $('#auth-submit').addEventListener('click', handleAuthSubmit);
    $('#auth-password').addEventListener('keydown', function (e) { if (e.key === 'Enter') handleAuthSubmit(); });
    $('#auth-menu-logout').addEventListener('click', handleLogout);
    $('#identity-switch-btn').addEventListener('click', function () {
      if (authUser) {
        const code = mySpace?.invite_code || '无';
        showToast(mySpace?.partner_id ? '已配对' : '邀请码: ' + code, 3000);
      } else {
        showAuthPage('login');
      }
    });

    try {
    db.init();
    await initAuth();
    setupTabs();
    setupSegments();
    setupNetworkDetection();
    setupLightbox();
    setupPhotoInput('#diary-photo-btn', '#diary-photo-input', '#diary-photo-preview', pendingDiaryPhotos);
    setupTimelinePhoto();

    // 记录 Tab
    $('#diary-new-btn').addEventListener('click', () => openDiaryEditor(todayStr(), getIdentity()));
    $('#diary-back-btn').addEventListener('click', closeDiaryEditor);
    $('#memo-add-btn').addEventListener('click', addMemo);
    $('#memo-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') addMemo(); });

    // 纸团 Tab
    $('#paper-ball').addEventListener('click', drawQuote);
    $('#quote-retry-btn').addEventListener('click', resetPaperBall);

    // 时间轴 Tab
    $('#timeline-save-btn').addEventListener('click', saveTimelineEvent);
    $('#timeline-load-more').addEventListener('click', () => loadTimeline(false));
    $('#timeline-sort-btn').addEventListener('click', toggleTimelineSort);

    // 悄悄话 Tab
    renderWhisperEmotionSelect();
    $('#whisper-send-btn').addEventListener('click', sendWhisper);
    $('#whisper-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendWhisper(); });

    // 我们 Tab
    renderPartnerMoodSelect();
    $('#add-quote-btn').addEventListener('click', handleAddQuote);
    $('#partner-search-btn').addEventListener('click', searchPartner);
    $('#partner-search-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') searchPartner(); });
    $('#partner-send-request-btn').addEventListener('click', sendRelationshipRequest);
    $('#copy-invite-btn').addEventListener('click', copyInviteCode);
    $('#copy-invite-btn-paired').addEventListener('click', copyInviteCode);

    // 修改昵称
    const saveNickname = async (inputId) => {
      const input = $(inputId);
      if (!input) return;
      const newNickname = input.value.trim();
      if (!newNickname) { showToast('请输入昵称'); return; }
      try {
        await db.updateProfile(authUser.id, { nickname: newNickname });
        myProfile.nickname = newNickname;
        showToast('昵称已保存');
        input.value = '';
        await initPartnerTab();
      } catch (e) {
        showToast('保存失败');
      }
    };
    $('#my-nickname-save-btn')?.addEventListener('click', () => saveNickname('#my-nickname-input'));
    $('#my-nickname-save-btn-unpaired')?.addEventListener('click', () => saveNickname('#my-nickname-input-unpaired'));

    // 解除配对
    $('#my-unpair-btn')?.addEventListener('click', async () => {
      if (!confirm('确定要解除配对吗？解除后双方数据将不再互通。')) return;
      try {
        await db.unpair(mySpace.id, authUser.id);
        mySpace = null;
        partnerProfile = null;
        showToast('已解除配对');
        await initPartnerTab();
      } catch (e) {
        showToast('解除配对失败');
      }
    });

    // 退出登录
    $('#my-logout-btn')?.addEventListener('click', async () => {
      if (!confirm('确定要退出登录吗？')) return;
      try {
        await db.signOut();
        showToast('已退出登录');
      } catch (e) {
        showToast('退出失败');
      }
    });

    // 头像选择
    const handleAvatarChange = async (inputEl, avatarEl) => {
      const file = inputEl.files?.[0];
      if (!file) return;

      console.log('[头像] 选择文件:', file.name, file.type, file.size);

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件');
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('图片不能超过 5MB');
        return;
      }

      try {
        showToast('正在上传头像...');

        // 压缩图片 (maxWidth=400, maxHeight=400, quality=0.8)
        console.log('[头像] 开始压缩图片...');
        const compressed = await compressImage(file, 400, 400, 0.8);
        console.log('[头像] 压缩完成:', compressed.name, compressed.type, compressed.size);

        // 上传到 Supabase Storage
        const timestamp = Date.now();
        const userIdShort = authUser.id.substring(0, 8);
        const fileName = `avatar-${userIdShort}-${timestamp}.jpg`;
        console.log('[头像] 开始上传:', fileName);
        const avatarUrl = await db.uploadAvatar(compressed, fileName);
        console.log('[头像] 上传成功:', avatarUrl);

        // 更新用户 profile
        await db.updateProfile(authUser.id, { avatar_url: avatarUrl });
        console.log('[头像] Profile 已更新');

        // 更新 UI
        if (avatarEl) {
          avatarEl.style.backgroundImage = `url(${avatarUrl})`;
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.style.backgroundPosition = 'center';
          avatarEl.textContent = '';
        }

        // 更新全局 profile
        if (myProfile) myProfile.avatar_url = avatarUrl;

        showToast('头像已更新 ✨');
      } catch (e) {
        console.error('[头像] 上传失败:', e);
        const errorMsg = e.message || e.error?.message || '未知错误';
        showToast(`头像上传失败: ${errorMsg}`);
      }
    };

    // 已配对头像
    $('#my-avatar-paired')?.parentElement?.addEventListener('click', () => {
      $('#avatar-input-paired').click();
    });
    $('#avatar-input-paired')?.addEventListener('change', function () {
      handleAvatarChange(this, $('#my-avatar-paired'));
    });

    // 未配对头像
    $('#my-avatar-unpaired')?.parentElement?.addEventListener('click', () => {
      $('#avatar-input-unpaired').click();
    });
    $('#avatar-input-unpaired')?.addEventListener('change', function () {
      handleAvatarChange(this, $('#my-avatar-unpaired'));
    });

    // 首页 → 去配对
    $('#home-go-partner-btn').addEventListener('click', () => switchTab('partner'));

    // 纪念日保存
    $('#anniversary-save-btn').addEventListener('click', async () => {
      const date = $('#anniversary-date-input').value;
      if (!date) { showToast('请选择日期'); return; }
      try {
        await db.setAnniversary(mySpace.id, date);
        mySpace.anniversary_date = date;
        showToast('纪念日已保存');
      } catch (e) {
        showToast('保存失败');
      }
    });

    // 登录页/空间 事件（次要）
    $('#auth-menu-invite').addEventListener('click', function () {
      if (mySpace?.invite_code) {
        showToast('邀请码: ' + mySpace.invite_code + '  分享给对方即可加入', 4000);
      }
    });
    $('#space-create-btn').addEventListener('click', handleCreateSpace);
    $('#space-join-btn').addEventListener('click', handleJoinSpace);
    $('#space-close').addEventListener('click', hideSpaceModal);
    $('#space-modal').addEventListener('click', function (e) { if (e.target === this) hideSpaceModal(); });

    // 未登录 → 显示登录页；已登录 → 显示应用
    if (!authUser) {
      showAuthPage('login');
    } else {
      hideAuthPage();
    }

    // 恢复上次 tab
    const savedTab = sessionStorage.getItem('emoBox_tab') || 'home';
    switchTab(savedTab);
    console.log('Love Space 情绪盒子 已就绪');
    } catch (e) {
      console.error('初始化失败:', e);
      // 兜底：至少显示登录页
      $('#auth-page').classList.remove('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
