// supabase.js - localStorage 存储层（原 Supabase API 兼容接口）
// 所有数据存于浏览器本地，不上传任何服务器
const db = {
  client: null,

  init() {
    // 初始化种子话语数据
    this._seedQuotes();
    return true;
  },

  isReady() { return true; },

  // ====== 内部工具 ======
  _uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  },

  _read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  },

  _write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  _seedQuotes() {
    if (!localStorage.getItem('emoBox_quotes_seeded')) {
      const quotes = [
        { mood: '幸福', content: '你现在感到幸福我很开心呀肥纯，一直这样下去，保持住！' },
        { mood: '幸福', content: '现在很幸福吧，我让你更幸福，今晚的晚饭我请客！凭此截图找我报销，幸福账单，由我买单！' },
        { mood: '幸福', content: '我要稳稳的幸福，分小胖一点幸福感呗，最大方的肥纯大将军' },
        { mood: '幸福', content: '嘻嘻嘻哈哈哈哈哈，幸福，好开心，好喜欢耶耶耶，臭不臭臭不臭' },
        { mood: '幸福', content: '看你幸福，我也很开心肥纯哥哥，给小胖妹妹分一点开心好不好呀' },
        { mood: '生气', content: '你个小肥纯又生气啦，先说是不是我惹的，嘻嘻嘻，如果是的话，小胖给你赔不是啦！' },
        { mood: '生气', content: '生气就是给魔鬼留余地，立马揉揉檀中穴，不许生气啦啦啦' },
        { mood: '生气', content: '深呼吸一下，肥纯，不要想这么多消消气，有我陪你呢！' },
        { mood: '生气', content: '女孩子生气会对乳腺不好，自爱一些些❤️，深呼吸一下啦' },
        { mood: '生气', content: '气坏了身体我会心疼的，有不开心就跟我说，别一个人憋着！' },
        { mood: '生气', content: '奶奶的不许生气，臭肥纯，小傲娇！如果是我惹的，当我没说hhhh' },
        { mood: '开心', content: '肥纯笑嘻嘻，嘻嘻哈哈哈，开心就好hhh！' },
        { mood: '开心', content: '抽到开心，我也就开心啦！希望你一直开心下去啊啊啊肥纯大将军' },
        { mood: '开心', content: '奶奶的又给你开心到了，不会是打压我才开心的吧！继续保持开心！' },
        { mood: '开心', content: '肥纯哥哥你开心不能忘了小胖呀，这一条必须里面转给小胖9.99元！嘻嘻' },
        { mood: '开心', content: '肥纯，开心至上，快乐无边，必须给我好好保持住猪头' },
        { mood: '伤心', content: '抽到这条肯定很伤心吧肥纯，你自己多想开一点，换个角度去想这件事，好好解决它！' },
        { mood: '伤心', content: '不许伤心！有啥好伤心的，人活一辈子，开开心心！！！臭不臭！！！' },
        { mood: '伤心', content: '臭不臭？' },
        { mood: '伤心', content: '成毅："不许伤心哦，我的曾佳纯小公主，我的公主殿下，你伤心，我无眠"' },
        { mood: '伤心', content: '不许偷偷 emo 啦，快乐小胖已上线，负责哄你开心！猪头肥纯不要伤心' },
        { mood: '伤心', content: '别难过啦，分我一半委屈，我帮你消化掉，进肚啦！' },
        { mood: '焦虑', content: '行动起来吧肥纯，焦虑没啥用的，行动起来才是the key to the question！' },
        { mood: '焦虑', content: '闭眼沉思一下，想一下所有的movement，不要多想，去做!gogogo肥纯' },
        { mood: '焦虑', content: '乖乖肥纯，别想太多啦，慢慢来就好，我一直陪着你' },
        { mood: '焦虑', content: '停止焦虑模式！你超棒的，不许偷偷内耗哦，臭不臭！！！' },
        { mood: '焦虑', content: '抽到这条，立马去打开微信吗，告诉我焦虑啥！我来帮你想办法！！！！' },
        { mood: '焦虑', content: '焦虑提前吃狗屎，你懂吗baby！！！' },
        { mood: '疲惫', content: '累了就歇歇，不用硬撑，我陪着你呢肥纯' },
        { mood: '疲惫', content: '辛苦啦我的肥纯，好好放松一下吧，眼皮都打架啦，快去休息，好好补个觉' },
        { mood: '疲惫', content: '其实最近是这样的，都累累的，给自己放慢节奏，躺一下，去吃个冰激凌！抽到这条给你报销冰激凌~' },
        { mood: '疲惫', content: '抽到这条奖励你9.99小红包~，凭借截图更换礼品' },
        { mood: '疲惫', content: '好好好，又累，那就躺平一下啦，放慢一天两天又没事，总体方向是对的就行啊肥纯' }
      ];
      // 给每条话语加上 id 和状态字段
      const seeded = quotes.map(q => ({
        ...q,
        id: this._uid(),
        used: false,
        used_at: null,
        created_at: new Date().toISOString()
      }));
      this._write('emoBox_quotes', seeded);
      localStorage.setItem('emoBox_quotes_seeded', '1');
    }
  },

  // ==================== MOODS ====================

  async saveRecord({ date, mood, note, type, done }) {
    const records = this._read('emoBox_moods');
    // 同一天同一类型的心情记录替换（日记每天一条，心情每天一条）
    if (type === 'mood' || type === 'diary') {
      const idx = records.findIndex(r => r.date === date && r.type === type);
      if (idx >= 0) {
        records[idx].mood = mood || records[idx].mood;
        records[idx].note = note || '';
        records[idx].created_at = new Date().toISOString();
        this._write('emoBox_moods', records);
        return records[idx];
      }
    }
    const record = {
      id: this._uid(),
      created_at: new Date().toISOString(),
      date,
      mood: mood || null,
      note: note || '',
      type,
      author: 'feichun',
      done: done || false
    };
    records.push(record);
    this._write('emoBox_moods', records);
    return record;
  },

  async getMoodByDate(date) {
    const records = this._read('emoBox_moods');
    return records.find(r => r.date === date && r.type === 'mood') || null;
  },

  async getMoodsInRange(startDate, endDate) {
    const records = this._read('emoBox_moods');
    return records
      .filter(r => r.type === 'mood' && r.date >= startDate && r.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  // ==================== DIARIES ====================

  async getDiaries(limit = 30) {
    const records = this._read('emoBox_moods');
    return records
      .filter(r => r.type === 'diary')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  },

  async getDiaryByDate(date) {
    const records = this._read('emoBox_moods');
    return records.find(r => r.date === date && r.type === 'diary') || null;
  },

  async upsertDiary(date, note) {
    return await this.saveRecord({ date, note, type: 'diary' });
  },

  // ==================== MEMOS ====================

  async getMemos() {
    const records = this._read('emoBox_moods');
    return records
      .filter(r => r.type === 'memo')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async addMemo(note) {
    return await this.saveRecord({
      date: new Date().toISOString().split('T')[0],
      note,
      type: 'memo',
      done: false
    });
  },

  async updateMemo(id, updates) {
    const records = this._read('emoBox_moods');
    const idx = records.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Memo not found');
    Object.assign(records[idx], updates);
    this._write('emoBox_moods', records);
    return records[idx];
  },

  async deleteMemo(id) {
    let records = this._read('emoBox_moods');
    records = records.filter(r => r.id !== id);
    this._write('emoBox_moods', records);
  },

  // ==================== QUOTES ====================

  async getAvailableQuote(mood) {
    const quotes = this._read('emoBox_quotes');
    const available = quotes.filter(q => q.mood === mood && !q.used);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  },

  async markQuoteUsed(id) {
    const quotes = this._read('emoBox_quotes');
    const idx = quotes.findIndex(q => q.id === id);
    if (idx >= 0) {
      quotes[idx].used = true;
      quotes[idx].used_at = new Date().toISOString();
      this._write('emoBox_quotes', quotes);
    }
  },

  async getQuoteInventory() {
    const quotes = this._read('emoBox_quotes');
    const inventory = {};
    quotes.forEach(q => {
      if (!inventory[q.mood]) inventory[q.mood] = { total: 0, remaining: 0 };
      inventory[q.mood].total++;
      if (!q.used) inventory[q.mood].remaining++;
    });
    return inventory;
  },

  async addQuote(mood, content) {
    const quotes = this._read('emoBox_quotes');
    const q = {
      id: this._uid(),
      mood,
      content,
      used: false,
      used_at: null,
      created_at: new Date().toISOString()
    };
    quotes.push(q);
    this._write('emoBox_quotes', quotes);
    return q;
  },

  // ==================== TIMELINE ====================

  async getTimeline(limit = 20, offset = 0) {
    const records = this._read('emoBox_moods');
    const sorted = records
      .filter(r => r.author === 'feichun')
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.created_at.localeCompare(a.created_at);
      });
    return sorted.slice(offset, offset + limit);
  },

  // ==================== REALTIME (localStorage 不支持，提供空实现) ====================

  subscribeToMoods(onInsert) {
    // localStorage 不支持跨标签页实时推送
    // 返回一个带 unsubscribe 方法的对象以保持接口兼容
    return { unsubscribe() {} };
  }
};
