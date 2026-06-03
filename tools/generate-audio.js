/* =========================================================
   配音批量生成脚本（火山引擎 / 豆包 语音合成大模型）
   ---------------------------------------------------------
   用法（在 ai-coding-learn-app 文件夹下打开终端）：
     1) 复制 tools/volc-config.example.json 为 tools/volc-config.json，
        填好 token（你的 Access Token）和 voice_type（挑好的音色 ID）。
     2) 运行：
        node tools/generate-audio.js            → 只生成"还没有的"课程音频
        node tools/generate-audio.js --force    → 全部重新生成（内容改过后用）
        node tools/generate-audio.js l2 l3      → 只(重新)生成指定课程
   生成的 mp3 会按 m1-l1.mp3 命名存进 audio/ 文件夹。
   需要 Node 18 及以上（用到内置 fetch）。
   ========================================================= */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 读取密钥配置
let cfg;
try {
  cfg = require('./volc-config.json');
} catch (e) {
  console.error('❌ 找不到 tools/volc-config.json');
  console.error('   请先复制 tools/volc-config.example.json 为 tools/volc-config.json 并填好。');
  process.exit(1);
}
if (!cfg.token || /粘到这里/.test(cfg.token) || !cfg.voice_type || /粘到这里/.test(cfg.voice_type)) {
  console.error('❌ 请先在 tools/volc-config.json 里填好 token 和 voice_type 两项。');
  process.exit(1);
}

// 读取课程数据（data.js 已做成既能给网页、也能给 Node 用）
const { LESSONS } = require('../js/data.js');

// 把一节课拼成"要朗读的文字"：标题 + 一句话解释 + 正文 + 结尾
function buildText(L) {
  return [L.title, L.oneLine].concat(L.body).concat([L.ending]).filter(Boolean).join('\n');
}

// 火山单次调用有字数上限，按句子把长文切成小块（每块 ~200 字）
function chunkText(text, max) {
  max = max || 200;
  const parts = text.split(/(?<=[。！？；\n])/); // 在句末标点后切，保留标点
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { chunks.push(cur); cur = p; }
    else { cur += p; }
  }
  if (cur.trim()) chunks.push(cur);
  // 万一单句还超长，硬切
  const out = [];
  for (const c of chunks) {
    if (c.length <= max) out.push(c);
    else for (let i = 0; i < c.length; i += max) out.push(c.slice(i, i + max));
  }
  return out.filter((s) => s.trim());
}

// 调用火山 TTS，返回这段文字的 mp3 数据
async function tts(text) {
  const body = {
    app: { appid: cfg.appid, token: cfg.token, cluster: cfg.cluster || 'volcano_tts' },
    user: { uid: 'ai-learn-app' },
    audio: { voice_type: cfg.voice_type, encoding: 'mp3', speed_ratio: cfg.speed_ratio || 1.0 },
    request: { reqid: crypto.randomUUID(), text: text, operation: 'query' },
  };
  const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer;' + cfg.token },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.data) {
    throw new Error('火山返回无音频，code=' + json.code + ' message=' + (json.message || JSON.stringify(json)).slice(0, 300));
  }
  return Buffer.from(json.data, 'base64'); // data 是 base64 编码的 mp3
}

(async function main() {
  const outDir = path.join(__dirname, '..', 'audio');
  fs.mkdirSync(outDir, { recursive: true });

  const force = process.argv.includes('--force');
  const onlyIds = process.argv.slice(2).filter((a) => /^l\d+$/.test(a)); // 指定课程，如 l2 l3

  const ids = Object.keys(LESSONS).filter(
    (id) => LESSONS[id].ready && (onlyIds.length ? onlyIds.includes(id) : true)
  );
  if (!ids.length) { console.log('没有需要生成的课程（都还没写完整内容？）'); return; }

  console.log('准备生成 ' + ids.length + ' 节课的配音，音色=' + cfg.voice_type + '\n');
  for (const id of ids) {
    const L = LESSONS[id];
    const file = path.join(outDir, path.basename(L.audio)); // 如 audio/m1-l1.mp3
    if (fs.existsSync(file) && !force && !onlyIds.includes(id)) {
      console.log('· 跳过(已存在) ' + path.basename(file));
      continue;
    }
    const chunks = chunkText(buildText(L), 200);
    process.stdout.write('· 生成 ' + path.basename(file) + '（' + chunks.length + ' 段）... ');
    const bufs = [];
    for (const c of chunks) bufs.push(await tts(c));
    const all = Buffer.concat(bufs);
    fs.writeFileSync(file, all);
    console.log('完成 ' + Math.round(all.length / 1024) + ' KB');
  }
  console.log('\n✅ 全部完成！mp3 已存进 audio/ 文件夹。');
})().catch((e) => {
  console.error('\n❌ 出错：' + e.message);
  process.exit(1);
});
