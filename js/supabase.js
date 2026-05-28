// supabase.js - Supabase 数据层
const db = {
  client: null,

  init() {
    this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    this._seedQuotes();
    return true;
  },

  isReady() { return true; },

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

    await this.client.from('quotes').insert(
      quotes.map(q => ({ ...q, used: false, created_at: new Date().toISOString() }))
    );
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

  async getDiaries(limit = 30) {
    const { data } = await this.client
      .from('moods')
      .select('*')
      .eq('type', 'diary')
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

  async getAvailableQuote(mood, drawnBy = 'feichun') {
    const targetAuthor = drawnBy === 'feichun' ? 'xiaopang' : 'feichun';
    const { data } = await this.client
      .from('quotes')
      .select('*')
      .eq('mood', mood)
      .eq('author', targetAuthor)
      .eq('used', false);
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  },

  async markQuoteUsed(id) {
    await this.client
      .from('quotes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', id);
  },

  async getQuoteInventory() {
    const { data } = await this.client
      .from('quotes')
      .select('mood, used, author');
    if (!data) return {};
    const inventory = {};
    data.forEach(q => {
      const key = `${q.author}_${q.mood}`;
      if (!inventory[key]) inventory[key] = { author: q.author, mood: q.mood, total: 0, remaining: 0 };
      inventory[key].total++;
      if (!q.used) inventory[key].remaining++;
    });
    return inventory;
  },

  async addQuote(mood, content, author) {
    const { data } = await this.client
      .from('quotes')
      .insert({ mood, content, author, used: false, created_at: new Date().toISOString() })
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
      .insert({ sender, emotion, content, is_read: false, created_at: new Date().toISOString() })
      .select()
      .single();
    return data;
  },

  async getWhispers(limit = 50) {
    const { data } = await this.client
      .from('whispers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
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
  }
};
