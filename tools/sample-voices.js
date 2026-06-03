/* 批量试听：用多种音色各生成一小段，存到 audio/samples/，方便挑声音。
   无效的音色会自动跳过。用法：node tools/sample-voices.js   */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./volc-config.json');

// 试听用的一小段文字
const TEXT = '你好呀，欢迎来到 AI 编程随身学。你不需要一开始就会写代码，先学会让 AI 听懂你的需求就好。';

// 候选音色（中文名 + voice_type）。生成不出来的会自动跳过。
const VOICES = [
  ['灿灿-通用女', 'zh_female_cancan_mars_bigtts'],
  ['爽快思思-女', 'zh_female_shuangkuaisisi_moon_bigtts'],
  ['湾湾小何-女', 'zh_female_wanwanxiaohe_moon_bigtts'],
  ['甜美小源-女', 'zh_female_tianmeixiaoyuan_moon_bigtts'],
  ['知性女声', 'zh_female_zhixingnvsheng_mars_bigtts'],
  ['清新女声', 'zh_female_qingxinnvsheng_mars_bigtts'],
  ['开朗姐姐-女', 'zh_female_kailangjiejie_moon_bigtts'],
  ['邻家女孩-女', 'zh_female_linjianvhai_moon_bigtts'],
  ['温暖阿虎-男', 'zh_male_wennuanahu_moon_bigtts'],
  ['少年梓辛-男', 'zh_male_shaonianzixin_moon_bigtts'],
  ['阳光青年-男', 'zh_male_yangguangqingnian_moon_bigtts'],
  ['清爽男大-男', 'zh_male_qingshuangnanda_mars_bigtts'],
  ['对话男声-男', 'zh_male_M392_conversation_wvae_bigtts'],
  ['VV-女', 'zh_female_vv_uranus_bigtts'],
];

async function tts(text, voice_type) {
  const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer;' + cfg.token },
    body: JSON.stringify({
      app: { appid: cfg.appid, token: cfg.token, cluster: cfg.cluster || 'volcano_tts' },
      user: { uid: 'ai-learn-app' },
      audio: { voice_type: voice_type, encoding: 'mp3', speed_ratio: 0.95 }, // 稍微放慢一点
      request: { reqid: crypto.randomUUID(), text: text, operation: 'query' },
    }),
  });
  const j = await res.json();
  if (!j.data) throw new Error('code=' + j.code + ' ' + (j.message || ''));
  return Buffer.from(j.data, 'base64');
}

(async function () {
  const outDir = path.join(__dirname, '..', 'audio', 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const ok = [];
  let i = 0;
  for (const [name, vt] of VOICES) {
    i++;
    const num = String(i).padStart(2, '0');
    try {
      const buf = await tts(TEXT, vt);
      fs.writeFileSync(path.join(outDir, num + '-' + name + '.mp3'), buf);
      ok.push(num + ' ' + name);
      console.log('✓ ' + num + ' ' + name + '  (' + vt + ')');
    } catch (e) {
      console.log('✗ ' + num + ' ' + name + '  跳过: ' + String(e.message).slice(0, 60));
    }
  }
  console.log('\n成功 ' + ok.length + ' 个，已存到 audio/samples/ 文件夹');
})().catch((e) => { console.error('出错:', e.message); process.exit(1); });
