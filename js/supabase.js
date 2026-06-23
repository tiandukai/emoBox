// supabase.js - Supabase 数据层
const db = {
  client: null,
  _userId: null,

  init() {
    this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    this._seedQuotes();
    return true;
  },

  isReady() { return true; },

  setUserId(id) { this._userId = id; },
  getUserId() { return this._userId; },

  // ====== 种子话语 ======
  async _seedQuotes() {
    const { count } = await this.client
      .from('quotes')
      .select('id', { count: 'exact', head: true });
    if (count > 0) return;

    const quotes = [
      { mood: '幸福', content: '你现在感到幸福我很开心呀肥纯，一直这样下去，保持住！', author: 'xiaopang' },
      { mood: '幸福', content: '现在很幸福吧，我让你更幸福，今晚的晚饭我请客！凭此截图找我报销，幸福账单，由我买单！', author: 'xiaopang' },
      { mood: '幸福', content: '我要稳稳的幸福，分小胖一点幸福感呗，最大方的肥纯大将军', author: 'xiaopang' },
      { mood: '幸福', content: '嘻嘻嘻哈哈哈哈哈，幸福，好开心，好喜欢耶耶耶，臭不臭臭不臭', author: 'xiaopang' },
      { mood: '幸福', content: '看你幸福，我也很开心肥纯哥哥，给小胖妹妹分一点开心好不好呀', author: 'xiaopang' },
      { mood: '生气', content: '你个小肥纯又生气啦，先说是不是我惹的，嘻嘻嘻，如果是的话，小胖给你赔不是啦！', author: 'xiaopang' },
      { mood: '生气', content: '生气就是给魔鬼留余地，立马揉揉檀中穴，不许生气啦啦啦', author: 'xiaopang' },
      { mood: '生气', content: '深呼吸一下，肥纯，不要想这么多消消气，有我陪你呢！', author: 'xiaopang' },
      { mood: '生气', content: '女孩子生气会对乳腺不好，自爱一些些，深呼吸一下啦', author: 'xiaopang' },
      { mood: '生气', content: '气坏了身体我会心疼的，有不开心就跟我说，别一个人憋着！', author: 'xiaopang' },
      { mood: '生气', content: '奶奶的不许生气，臭肥纯，小傲娇！如果是我惹的，当我没说hhhh', author: 'xiaopang' },
      { mood: '开心', content: '肥纯笑嘻嘻，嘻嘻哈哈哈，开心就好hhh！', author: 'xiaopang' },
      { mood: '开心', content: '抽到开心，我也就开心啦！希望你一直开心下去啊啊啊肥纯大将军', author: 'xiaopang' },
      { mood: '开心', content: '奶奶的又给你开心到了，不会是打压我才开心的吧！继续保持开心！', author: 'xiaopang' },
      { mood: '开心', content: '肥纯哥哥你开心不能忘了小胖呀，这一条必须里面转给小胖9.99元！嘻嘻', author: 'xiaopang' },
      { mood: '开心', content: '肥纯，开心至上，快乐无边，必须给我好好保持住猪头', author: 'xiaopang' },
      { mood: '伤心', content: '抽到这条肯定很伤心吧肥纯，你自己多想开一点，换个角度去想这件事，好好解决它！', author: 'xiaopang' },
      { mood: '伤心', content: '不许伤心！有啥好伤心的，人活一辈子，开开心心！！！臭不臭！！！', author: 'xiaopang' },
      { mood: '伤心', content: '臭不臭？', author: 'xiaopang' },
      { mood: '伤心', content: '成毅："不许伤心哦，我的曾佳纯小公主，我的公主殿下，你伤心，我无眠"', author: 'xiaopang' },
      { mood: '伤心', content: '不许偷偷 emo 啦，快乐小胖已上线，负责哄你开心！猪头肥纯不要伤心', author: 'xiaopang' },
      { mood: '伤心', content: '别难过啦，分我一半委屈，我帮你消化掉，进肚啦！', author: 'xiaopang' },
      { mood: '焦虑', content: '行动起来吧肥纯，焦虑没啥用的，行动起来才是the key to the question！', author: 'xiaopang' },
      { mood: '焦虑', content: '闭眼沉思一下，想一下所有的movement，不要多想，去做!gogogo肥纯', author: 'xiaopang' },
      { mood: '焦虑', content: '乖乖肥纯，别想太多啦，慢慢来就好，我一直陪着你', author: 'xiaopang' },
      { mood: '焦虑', content: '停止焦虑模式！你超棒的，不许偷偷内耗哦，臭不臭！！！', author: 'xiaopang' },
      { mood: '焦虑', content: '抽到这条，立马去打开微信吗，告诉我焦虑啥！我来帮你想办法！！！！', author: 'xiaopang' },
      { mood: '焦虑', content: '焦虑提前吃狗屎，你懂吗baby！！！', author: 'xiaopang' },
      { mood: '疲惫', content: '累了就歇歇，不用硬撑，我陪着你呢肥纯', author: 'xiaopang' },
      { mood: '疲惫', content: '辛苦啦我的肥纯，好好放松一下吧，眼皮都打架啦，快去休息，好好补个觉', author: 'xiaopang' },
      { mood: '疲惫', content: '其实最近是这样的，都累累的，给自己放慢节奏，躺一下，去吃个冰激凌！抽到这条给你报销冰激凌~', author: 'xiaopang' },
      { mood: '疲惫', content: '抽到这条奖励你9.99小红包~，凭借截图更换礼品', author: 'xiaopang' },
      { mood: '疲惫', content: '好好好，又累，那就躺平一下啦，放慢一天两天又没事，总体方向是对的就行啊肥纯', author: 'xiaopang' }
    ];

    // 种子话语已移除，每对情侣从零开始补充
  },

  // ==================== STORAGE ====================

  async uploadImage(file) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { data, error } = await this.client.storage
      .from('photos')
      .upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = this.client.storage.from('photos').getPublicUrl(path);
    return { path, url: urlData.publicUrl };
  },

  // 上传头像
  async uploadAvatar(file, fileName) {
    console.log('[DB] 上传头像:', fileName);
    // 直接上传到 photos bucket 根目录，不使用子文件夹
    const { data, error } = await this.client.storage
      .from('photos')
      .upload(fileName, file, {
        upsert: true,
        contentType: 'image/jpeg'
      });
    if (error) {
      console.error('[DB] 头像上传失败:', error);
      throw error;
    }
    console.log('[DB] 头像上传成功:', data);
    const { data: urlData } = this.client.storage.from('photos').getPublicUrl(fileName);
    console.log('[DB] 获取URL:', urlData.publicUrl);
    return urlData.publicUrl;
  },

  async deleteImages(paths) {
    if (!paths || paths.length === 0) return;
    await this.client.storage.from('photos').remove(paths);
  },

  // ==================== MOODS ====================

  async saveRecord({ date, mood, note, type, done, author, images }) {
    const recordAuthor = author || 'feichun';
    const recordImages = images || [];

    if (type === 'mood' || type === 'diary') {
      // 查询同一天同一类型同一作者的已有记录
      const { data: existing } = await this.client
        .from('moods')
        .select('id, images')
        .eq('date', date)
        .eq('type', type)
        .eq('author', recordAuthor)
        .maybeSingle();

      if (existing) {
        const merged = [...(existing.images || []), ...recordImages];
        const updates = { note: note || '', images: merged };
        if (mood) updates.mood = mood;
        updates.created_at = new Date().toISOString();
        const { data } = await this.client
          .from('moods')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        return data;
      }
    }

    // 新记录（mood/diary 首次，或 memo 每次）
    const record = {
      date,
      mood: mood || null,
      note: note || '',
      type,
      author: recordAuthor,
      done: done || false,
      images: recordImages,
      user_id: this._userId,
      created_at: new Date().toISOString()
    };
    const { data } = await this.client
      .from('moods')
      .insert(record)
      .select()
      .single();
    return data;
  },

  async getMoodByDate(date, author = 'feichun') {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('date', date)
      .eq('type', 'mood')
      .eq('author', author)
      .maybeSingle();
    return data;
  },

  async getMoodsInRange(startDate, endDate) {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('type', 'mood')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    return data || [];
  },

  // ==================== DIARIES ====================

  async getDiaries(author, limit = 30) {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('type', 'diary')
      .eq('author', author)
      .order('date', { ascending: false })
      .limit(limit);
    return data || [];
  },

  async getDiaryByDate(date, author = 'feichun') {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('date', date)
      .eq('type', 'diary')
      .eq('author', author)
      .maybeSingle();
    return data;
  },

  async upsertDiary(date, note, author, images) {
    return await this.saveRecord({ date, note, type: 'diary', author, images });
  },

  // ==================== MEMOS ====================

  async getMemos(author = 'feichun') {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('type', 'memo')
      .eq('author', author)
      .order('created_at', { ascending: true });
    return data || [];
  },

  async addMemo(note, author) {
    return await this.saveRecord({
      date: new Date().toISOString().split('T')[0],
      note,
      type: 'memo',
      done: false,
      author
    });
  },

  async updateMemo(id, updates) {
    const { data } = await this.client
      .from('moods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return data;
  },

  async deleteMemo(id) {
    await this.client.from('moods').delete().eq('id', id);
  },

  // ==================== QUOTES ====================

  async getAvailableQuote(mood) {
    const userId = await this._getUserId();
    if (!userId) return null;
    const { data } = await this.client
      .from('quotes')
      .select('*')
      .eq('mood', mood)
      .eq('used', false);
    if (!data || data.length === 0) return null;
    const available = data.filter(q =>
      q.user_id !== userId &&
      !(q.used_by || []).includes(userId)
    );
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  },

  async markQuoteUsed(id) {
    const userId = await this._getUserId();
    if (!userId) return;
    const { data: quote } = await this.client
      .from('quotes')
      .select('used_by')
      .eq('id', id)
      .single();
    const current = quote?.used_by || [];
    if (!current.includes(userId)) {
      current.push(userId);
    }
    await this.client
      .from('quotes')
      .update({ used_by: current, used_at: new Date().toISOString() })
      .eq('id', id);
  },

  async getQuoteInventory() {
    const userId = await this._getUserId();
    const { data } = await this.client
      .from('quotes')
      .select('mood, used, used_by, author, user_id');
    if (!data) return {};
    const inventory = {};
    data.forEach(q => {
      if (q.user_id === userId) return;
      const openedByMe = (q.used_by || []).includes(userId);
      if (!inventory[q.mood]) inventory[q.mood] = { mood: q.mood, total: 0, remaining: 0 };
      inventory[q.mood].total++;
      if (!openedByMe) inventory[q.mood].remaining++;
    });
    return inventory;
  },

  async _getUserId() {
    if (this._userId) return this._userId;
    const { data } = await this.client.auth.getUser();
    const id = data?.user?.id || null;
    if (id) this._userId = id;
    return id;
  },

  async addQuote(mood, content, author) {
    const userId = await this._getUserId();
    const { data } = await this.client
      .from('quotes')
      .insert({ mood, content, author, used: false, used_by: [], user_id: userId, created_at: new Date().toISOString() })
      .select()
      .single();
    return data;
  },

  // ==================== TIMELINE ====================

  async getTimeline(limit = 20, offset = 0) {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('type', 'mood')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return data || [];
  },

  // ==================== WHISPERS ====================

  async sendWhisper(sender, emotion, content) {
    const { data } = await this.client
      .from('whispers')
      .insert({ sender, emotion, content, is_read: false, user_id: this._userId, created_at: new Date().toISOString() })
      .select()
      .single();
    return data;
  },

  async getWhispers(limit = 20, offset = 0, partnerUserId = null) {
    let query = this.client
      .from('whispers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (this._userId) {
      if (partnerUserId) {
        query = query.or(`user_id.eq.${this._userId},user_id.eq.${partnerUserId}`);
      } else {
        query = query.eq('user_id', this._userId);
      }
    }
    const { data } = await query;
    return (data || []).reverse();
  },

  async markWhispersRead() {
    await this.client
      .from('whispers')
      .update({ is_read: true })
      .eq('is_read', false);
  },

  async getUnreadWhisperCount() {
    const { count } = await this.client
      .from('whispers')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    return count || 0;
  },

  // ==================== REALTIME ====================

  subscribeToMoods(onInsert) {
    const channel = this.client
      .channel('moods-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moods' },
        payload => onInsert(payload.new)
      )
      .subscribe();
    return { unsubscribe() { channel.unsubscribe(); } };
  },

  // ==================== TIMELINE EVENTS ====================

  async addTimelineEvent({ date, city, place, note, image, author }) {
    const { data, error } = await this.client
      .from('timeline_events')
      .insert({
        date,
        city: city || '',
        place: place || '',
        note: note || '',
        image: image || null,
        author: author || 'feichun',
        user_id: this._userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTimelineEvents(limit = 50, offset = 0, ascending = false) {
    const { data, error } = await this.client
      .from('timeline_events')
      .select('*')
      .order('date', { ascending })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  },

  async getTimelineEventCount() {
    const { count, error } = await this.client
      .from('timeline_events')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  async deleteTimelineEvent(id) {
    const { error } = await this.client
      .from('timeline_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateTimelineEvent(id, updates) {
    const { data, error } = await this.client
      .from('timeline_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  subscribeToWhispers(onInsert) {
    const channel = this.client
      .channel('whispers-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whispers' },
        payload => onInsert(payload.new)
      )
      .subscribe();
    return { unsubscribe() { channel.unsubscribe(); } };
  },

  subscribeToTimelineEvents(onInsert) {
    const channel = this.client
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'timeline_events' },
        payload => {
          console.log('[Realtime] 收到 timeline_events 新事件:', payload.new);
          onInsert(payload.new);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] 时间轴订阅状态:', status);
        if (err) console.error('[Realtime] 时间轴订阅错误:', err);
      });
    return { unsubscribe() { channel.unsubscribe(); } };
  },

  // ==================== AUTH ====================

  async signUp(email, password) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await this.client.auth.signOut();
  },

  async getUser() {
    const { data } = await this.client.auth.getUser();
    return data.user || null;
  },

  onAuthChange(cb) {
    return this.client.auth.onAuthStateChange((event, session) => {
      cb(event, session?.user || null);
    });
  },

  // ==================== PROFILES ====================

  async createProfile(userId, nickname) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data, error } = await this.client
      .from('profiles')
      .insert({ id: userId, nickname, invite_code: code })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProfile(userId) {
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ==================== SPACE & RELATIONSHIP ====================

  // 获取当前用户的邀请码，没有则自动生成
  async getMyInviteCode(userId) {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('账号信息未找到');
    if (!profile.invite_code) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await this.updateProfile(userId, { invite_code: code });
      return code;
    }
    return profile.invite_code;
  },

  // 通过邀请码搜索用户
  async searchByInviteCode(inviteCode) {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, nickname, invite_code')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('未找到该邀请码对应的用户');
    return data;
  },

  // 发送恋爱请求
  async sendRelationshipRequest(fromUserId, toUserId) {
    if (fromUserId === toUserId) throw new Error('不能给自己发送请求');
    const { data, error } = await this.client
      .from('relationship_requests')
      .insert({ from_user: fromUserId, to_user: toUserId, status: 'pending' })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('已发送过请求，请等待对方回应');
      throw error;
    }
    return data;
  },

  // 获取发给我的待处理请求
  async getPendingRequests(userId) {
    const { data } = await this.client
      .from('relationship_requests')
      .select('id, from_user, status, created_at, profiles!relationship_requests_from_user_fkey(nickname)')
      .eq('to_user', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return data || [];
  },

  // 同意请求 — 自动创建空间
  async acceptRequest(requestId, userId) {
    // 1. 获取请求详情
    const { data: req } = await this.client
      .from('relationship_requests')
      .select('*')
      .eq('id', requestId)
      .eq('to_user', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (!req) throw new Error('请求不存在或已处理');

    // 2. 创建情侣空间
    const { data: space, error: spaceErr } = await this.client
      .from('couple_spaces')
      .insert({ owner_id: req.from_user, partner_id: userId })
      .select()
      .single();
    if (spaceErr) throw spaceErr;

    // 3. 更新双方 profiles
    await this.updateProfile(req.from_user, { space_id: space.id });
    await this.updateProfile(userId, { space_id: space.id });

    // 4. 更新请求状态
    await this.client
      .from('relationship_requests')
      .update({ status: 'accepted', resolved_at: new Date().toISOString() })
      .eq('id', requestId);

    return space;
  },

  // 拒绝请求
  async rejectRequest(requestId, userId) {
    const { error } = await this.client
      .from('relationship_requests')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('to_user', userId)
      .eq('status', 'pending');
    if (error) throw error;
  },

  // 获取我发出的请求状态
  async getMySentRequests(userId) {
    const { data } = await this.client
      .from('relationship_requests')
      .select('id, to_user, status, created_at, profiles!relationship_requests_to_user_fkey(nickname)')
      .eq('from_user', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  },

  // 订阅发给我的恋爱请求（实时通知）
  subscribeToRelationshipRequests(userId, onInsert) {
    const channel = this.client
      .channel('rr-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'relationship_requests', filter: `to_user=eq.${userId}` },
        payload => onInsert(payload.new)
      )
      .subscribe();
    return { unsubscribe() { channel.unsubscribe(); } };
  },

  // 设置纪念日
  async setAnniversary(spaceId, date) {
    const { error } = await this.client
      .from('couple_spaces')
      .update({ anniversary_date: date })
      .eq('id', spaceId);
    if (error) throw error;
  },

  // ====== 保留旧方法兼容 ======

  async createSpace(ownerId, nickname) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data: space, error: spaceErr } = await this.client
      .from('couple_spaces')
      .insert({ owner_id: ownerId, invite_code: code })
      .select()
      .single();
    if (spaceErr) throw spaceErr;

    await this.updateProfile(ownerId, { nickname, space_id: space.id, invite_code: code });
    return space;
  },

  async joinSpace(userId, inviteCode) {
    const { data: space, error: findErr } = await this.client
      .from('couple_spaces')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle();
    if (findErr) throw findErr;
    if (!space) throw new Error('邀请码无效');
    if (space.partner_id) throw new Error('该空间已有两个人');

    const profile = await this.getProfile(userId);
    if (profile?.space_id && profile.space_id !== space.id) {
      await this.client.from('couple_spaces').delete().eq('id', profile.space_id);
    }

    const { error: joinErr } = await this.client
      .from('couple_spaces')
      .update({ partner_id: userId })
      .eq('id', space.id);
    if (joinErr) throw joinErr;

    await this.updateProfile(userId, { space_id: space.id });
    return space;
  },

  async getSpace(spaceId) {
    const { data } = await this.client
      .from('couple_spaces')
      .select('*')
      .eq('id', spaceId)
      .maybeSingle();
    return data;
  },

  // 解除配对
  async unpair(spaceId, userId) {
    // 1. 获取空间信息
    const space = await this.getSpace(spaceId);
    if (!space) throw new Error('空间不存在');

    // 2. 更新双方 profiles 的 space_id 为 null
    const partnerId = space.owner_id === userId ? space.partner_id : space.owner_id;
    await this.updateProfile(userId, { space_id: null });
    if (partnerId) {
      await this.updateProfile(partnerId, { space_id: null });
    }

    // 3. 删除情侣空间
    await this.client
      .from('couple_spaces')
      .delete()
      .eq('id', spaceId);

    return true;
  },

  async getPartnerProfile(spaceId, myUserId) {
    if (!spaceId) return null;
    const { data: space } = await this.client
      .from('couple_spaces')
      .select('*')
      .eq('id', spaceId)
      .maybeSingle();
    if (!space) return null;
    const partnerId = space.owner_id === myUserId ? space.partner_id : space.owner_id;
    if (!partnerId) return null;
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle();
    return data;
  }
};
