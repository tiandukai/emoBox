// seed-quotes.js - 将 情绪话语 文件导入 Supabase quotes 表
// 使用方法: node seed-quotes.js
// 前提: 设置环境变量 SUPABASE_URL 和 SUPABASE_KEY
//   Windows: set SUPABASE_URL=xxx && set SUPABASE_KEY=xxx && node seed-quotes.js
//   Mac/Linux: SUPABASE_URL=xxx SUPABASE_KEY=xxx node seed-quotes.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 情绪映射: 文件中的情绪名 -> 数据库情绪名
const MOOD_MAP = {
  '幸福': '幸福',
  '生气': '生气',
  '开心': '开心',
  '伤心': '伤心',
  '焦虑': '焦虑',
  '疲惫': '疲惫'
};

function parseQuotes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  const quotes = [];
  let currentMood = null;

  for (const line of lines) {
    // 检测情绪标题行（以中文冒号结尾）
    if (line.match(/^[^\d]+[：:]$/)) {
      currentMood = line.replace(/[：:]\s*$/, '').trim();
      if (!MOOD_MAP[currentMood]) {
        console.warn(`未知情绪: ${currentMood}`);
        currentMood = null;
      }
    } else if (currentMood && /^\d+\./.test(line)) {
      const content = line.replace(/^\d+\.\s*/, '').trim();
      if (content) {
        quotes.push({
          mood: MOOD_MAP[currentMood],
          content,
          used: false
        });
      }
    }
  }

  return quotes;
}

async function seed() {
  const filePath = path.join(__dirname, '..', '情绪话语');
  const quotes = parseQuotes(filePath);

  console.log(`\n解析到 ${quotes.length} 条话语\n`);

  // 统计每个情绪的数量
  const counts = {};
  quotes.forEach(q => {
    counts[q.mood] = (counts[q.mood] || 0) + 1;
  });
  console.log('情绪分布:');
  Object.entries(counts).forEach(([mood, count]) => {
    console.log(`  ${mood}: ${count} 条`);
  });

  // 清空旧数据（使用 is not null 作为安全的删除条件）
  console.log('\n正在清空旧数据...');
  const { error: deleteErr } = await supabase
    .from('quotes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteErr) {
    console.warn('清空旧数据警告:', deleteErr.message);
  } else {
    console.log('旧数据已清空');
  }

  // 批量插入
  console.log('\n正在导入数据...');
  const { data, error } = await supabase
    .from('quotes')
    .insert(quotes)
    .select();

  if (error) {
    console.error('导入失败:', error.message);
    process.exit(1);
  }

  console.log(`\n成功导入 ${data.length} 条话语！`);
  console.log('─'.repeat(40));
  data.forEach(q => console.log(`  [${q.mood}] ${q.content}`));
  console.log('─'.repeat(40));
  console.log('\n种子数据导入完成，现在可以在应用中使用纸团功能了 🎁\n');
  process.exit(0);
}

seed();
