/* =========================================================
   闯关游戏 · 主程序
   页面：主页 home / 关卡地图 map / 我的 profile / 关卡 level / 结算 result
   ========================================================= */
const G = window.GAME;
const app = document.getElementById('gapp');

/* ---------- 本机存档 ---------- */
const GKEY = 'aedu_game_v1';
function gload() {
  const base = { done: {}, xp: 0, visitDays: [] };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(GKEY) || '{}')); } catch (e) { return base; }
}
function gsave() { try { localStorage.setItem(GKEY, JSON.stringify(gs)); } catch (e) {} }
let gs = gload();

function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function recordDay() { const t = todayStr(); gs.visitDays = gs.visitDays || []; if (!gs.visitDays.includes(t)) { gs.visitDays.push(t); gsave(); } }
function streak() {
  const set = new Set(gs.visitDays || []); if (!set.size) return 0;
  let n = 0, d = new Date();
  for (;;) { const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); if (set.has(k)) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function levelNo() { return Math.floor((gs.xp || 0) / 100) + 1; }

/* ---------- 小工具 ---------- */
function allLevelIds() { const ids = []; G.chapters.forEach((c) => c.levels.forEach((id) => ids.push(id))); return ids; }
function doneCount() { return allLevelIds().filter((id) => gs.done[id]).length; }
function totalStars() { return allLevelIds().reduce((s, id) => s + (gs.done[id] || 0), 0); }
function isUnlocked(id) { const ids = allLevelIds(), i = ids.indexOf(id); if (i <= 0) return true; return !!gs.done[ids[i - 1]]; }
function nextLevel() {
  const ids = allLevelIds();
  for (const id of ids) if (G.levels[id].ready && !gs.done[id] && isUnlocked(id)) return id;
  return ids.find((id) => G.levels[id].ready) || ids[0];
}
function typeLabel(t) { return t === 'choice' ? '选择题' : t === 'judge' ? '判断题' : '连连看'; }

// 小五头像（cls 控制大小/动效）
function m5(cls) {
  return `<svg class="m5 ${cls || ''}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#ffc062"/>
    <circle cx="32" cy="34" r="24" fill="#ff8a5b"/>
    <ellipse cx="21" cy="39.5" rx="4.2" ry="2.6" fill="#ff4d73" opacity=".45"/>
    <ellipse cx="43" cy="39.5" rx="4.2" ry="2.6" fill="#ff4d73" opacity=".45"/>
    <circle cx="24" cy="30" r="5.3" fill="#fff"/><circle cx="40" cy="30" r="5.3" fill="#fff"/>
    <circle cx="25" cy="31" r="2.5" fill="#41342c"/><circle cx="41" cy="31" r="2.5" fill="#41342c"/>
    <circle cx="23.3" cy="29.4" r="1.1" fill="#fff"/><circle cx="39.3" cy="29.4" r="1.1" fill="#fff"/>
    <path d="M25 41 q7 7.5 14 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* ---------- 新手引导（首次打开，3 屏，小五讲，可跳过） ---------- */
const SLIDES = [
  { t: '嗨，我是小五！👋', b: '<b>AI 时代来了</b>——会用 AI 干活的人，做事更快、也更吃香。好消息是：<b>你不用懂代码，也能学会。</b>' },
  { t: '像玩游戏一样学', b: '我会一关一关带你玩，碎片时间就能学，<b>答错也没关系</b>——玩着玩着，你就懂了。' },
  { t: '学完你能做到', b: '看懂"前端、后端、API"这些词、会<b>指挥 AI 帮你做东西</b>、甚至自己做出一个小网页。准备好了吗？' },
];
let introI = 0;
function viewIntro() {
  const s = SLIDES[introI], last = introI === SLIDES.length - 1;
  return `<div class="intro">
    <button class="skip" data-act="intro-skip">跳过</button>
    <div class="intro-card">
      ${m5('hero')}
      <h2 class="intro-t">${s.t}</h2>
      <p class="intro-b">${s.b}</p>
    </div>
    <div class="dots">${SLIDES.map((_, i) => `<span class="dot ${i === introI ? 'on' : ''}"></span>`).join('')}</div>
    <button class="cta" data-act="intro-next">${last ? '开始吧！🎉' : '下一步 →'}</button>
  </div>`;
}
function finishIntro() { gs.onboarded = true; gsave(); introI = 0; go('home'); }
function setupIntroSwipe() {
  const el = document.querySelector('.intro'); if (!el) return;
  let x0 = null;
  el.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
  el.ontouchend = (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (dx < -40) { if (introI < SLIDES.length - 1) { introI++; render(); } else finishIntro(); }
    else if (dx > 40 && introI > 0) { introI--; render(); }
    x0 = null;
  };
}

/* ---------- 主页 ---------- */
function viewHome() {
  const st = streak(), xp = gs.xp || 0, lv = levelNo();
  const ids = allLevelIds(), dc = doneCount(), rec = nextLevel();
  const started = dc > 0;
  const hi = st > 1 ? `你已经连续陪我 <b>${st}</b> 天啦，` : '很高兴见到你，';
  return `
    <div class="hero">
      <div class="blob b1"></div><div class="blob b2"></div>
      ${m5('hero')}
      <div class="hero-bubble"><b>嗨，我是小五！</b><br>${hi}今天也来玩两关吧～</div>
    </div>
    <div class="statrow">
      <div class="statc"><div class="sv">🔥${st}</div><div class="sk">连胜</div></div>
      <div class="statc"><div class="sv">⭐${xp}</div><div class="sk">经验</div></div>
      <div class="statc"><div class="sv">Lv.${lv}</div><div class="sk">等级</div></div>
    </div>
    <div class="homecard">
      <div class="hc-top"><span class="hc-ch">${G.chapters[0].title}</span><span class="hc-prog">${dc}/${ids.length} 关</span></div>
      <div class="hc-bar"><i style="width:${Math.round(dc / ids.length * 100)}%"></i></div>
      <div class="hc-row">${m5('sm')}<div class="hc-title">下一关：${G.levels[rec].title}</div></div>
      <button class="cta" data-act="enter" data-id="${rec}">${started ? '继续闯关' : '开始闯关'} →</button>
    </div>
    <button class="cta ghost" data-act="gotab" data-tab="map">🗺️ 看关卡地图</button>
  `;
}

/* ---------- 关卡地图 ---------- */
function mascotMapLine() {
  const st = streak(), rec = nextLevel();
  const readyDone = allLevelIds().filter((id) => G.levels[id].ready).every((id) => gs.done[id]);
  const moreComing = allLevelIds().some((id) => !G.levels[id].ready);
  if (readyDone) {
    return moreComing
      ? `这几关都过啦，真棒！后面几关小五<b>正在备课</b>，马上上线～`
      : `全部通关，你太强了！🎉`;
  }
  return `${st > 1 ? `连续 <b>${st}</b> 天，棒！` : '来吧！'}下一关：<b>${G.levels[rec].title}</b>`;
}
function viewMap() {
  let html = `<div class="gtop">
    <span class="chip fire">🔥 ${streak()}</span>
    <span class="chip xp">⭐ ${gs.xp || 0}</span>
    <span class="chip lvl">Lv.${levelNo()}</span>
  </div>`;
  G.chapters.forEach((c) => {
    html += `<div class="chapter">${c.title}</div><div class="path"><span class="pdecor pd1">🌱</span><span class="pdecor pd2">✨</span><span class="pdecor pd3">⭐</span>`;
    c.levels.forEach((id, idx) => {
      const L = G.levels[id], done = gs.done[id], unlocked = isUnlocked(id);
      const cls = done ? 'done' : (unlocked && L.ready ? 'cur' : 'lock');
      const off = ['off1', 'off2', 'off3', 'off4'][idx % 4];
      const inner = done ? '✓' : (cls === 'lock' ? '🔒' : L.icon);
      const stars = done ? `<span class="nstar">${'⭐'.repeat(gs.done[id])}</span>` : '';
      const pop = cls === 'cur' ? '<span class="pop">开始</span>' : '';
      const click = (done || cls === 'cur') ? `data-act="enter" data-id="${id}"` : '';
      html += `<div class="node ${cls} ${off}" ${click}>${inner}${stars}${pop}</div>`;
    });
    html += `</div>`;
  });
  html += `<div class="m5card">${m5('mid')}<div class="bubble">${mascotMapLine()}</div></div>`;
  return html;
}

/* ---------- 我的 ---------- */
function viewProfile() {
  return `
    <h1 class="ptitle">我的</h1>
    <div class="m5card">${m5('mid')}<div class="bubble">学得不错嘛！小五一直给你记着账呢～</div></div>
    <div class="pgrid">
      <div class="pcard"><div class="pv">${streak()}</div><div class="pk">连续天数</div></div>
      <div class="pcard"><div class="pv">${doneCount()}</div><div class="pk">通关数</div></div>
      <div class="pcard"><div class="pv">${totalStars()}</div><div class="pk">总星星 ⭐</div></div>
      <div class="pcard"><div class="pv">Lv.${levelNo()}</div><div class="pk">当前等级</div></div>
    </div>
    <p class="pnote">进度保存在本机 · 第一版试用</p>
  `;
}

/* ---------- 关卡页（外壳） ---------- */
function viewLevel(id) {
  const L = G.levels[id];
  if (!L.ready || !L.exercises.length) {
    return `<div class="ltop"><button class="x" data-act="map">✕</button></div>
      <div class="coming">${m5('mid')}<p>这一关小五还在备课中，<br>很快就来～</p><button class="cta" data-act="map">回地图</button></div>`;
  }
  return `<div class="ltop"><button class="x" data-act="map">✕</button><div class="pbar"><i id="pbarfill"></i></div></div>
    <div id="exwrap"></div>`;
}

/* ---------- 关卡引擎 ---------- */
let ex = null;
function startLevel(id) {
  const L = G.levels[id];
  if (!L.ready || !L.exercises.length) return;
  ex = { id: id, i: 0, mistakes: 0, match: null };
  renderExercise();
}
function renderExercise() {
  const L = G.levels[ex.id], list = L.exercises;
  if (ex.i >= list.length) { finishLevel(); return; }
  const e = list[ex.i];
  const fill = document.getElementById('pbarfill'); if (fill) fill.style.width = (ex.i / list.length * 100) + '%';

  let body = '';
  if (e.type === 'choice') body = e.options.map((o, i) => `<button class="opt" data-act="pick" data-i="${i}">${o}</button>`).join('');
  else if (e.type === 'judge') body = ['对', '错'].map((o, i) => `<button class="opt judge" data-act="pick" data-i="${i}">${o}</button>`).join('');
  else if (e.type === 'match') body = renderMatch(e);

  const wrap = document.getElementById('exwrap');
  wrap.innerHTML = `<div class="extag">${typeLabel(e.type)} · 第 ${ex.i + 1}/${list.length} 题</div>
    <div class="ask">${m5('sm')}<div class="say">${e.mascot ? '<b>' + e.mascot + '</b> ' : ''}${e.q}</div></div>
    <div class="exbody ${e.type === 'judge' ? 'row' : ''}" id="exbody">${body}</div>
    <div id="exfb"></div>`;
  if (e.type === 'match') ex.match = { sel: null, matched: 0, total: e.pairs.length };
}
function pick(i) {
  const e = G.levels[ex.id].exercises[ex.i];
  const correct = e.type === 'judge' ? (e.answer === true ? 0 : 1) : e.answer;
  const opts = document.querySelectorAll('#exbody .opt');
  opts.forEach((o) => o.classList.add('dis'));
  opts[correct].classList.add('right');
  const ok = i === correct;
  if (!ok) { opts[i].classList.add('wrong'); ex.mistakes++; }
  showFeedback(ok, e.explain);
}
function renderMatch(e) {
  const lefts = e.pairs.map((p) => p[0]);
  const rights = e.pairs.map((p, i) => [p[1], i]).sort(() => Math.random() - 0.5);
  let h = '<div class="match"><div class="mcol" id="mleft">';
  h += lefts.map((l, i) => `<button class="mitem" data-act="m" data-side="L" data-key="${i}">${l}</button>`).join('');
  h += '</div><div class="mcol" id="mright">';
  h += rights.map(([r, origIdx]) => `<button class="mitem" data-act="m" data-side="R" data-key="${origIdx}">${r}</button>`).join('');
  h += '</div></div>';
  return h;
}
function matchTap(el) {
  if (!ex.match || el.classList.contains('mdone')) return;
  const side = el.dataset.side, key = el.dataset.key;
  if (side === 'L') {
    document.querySelectorAll('#mleft .mitem').forEach((x) => x.classList.remove('sel'));
    el.classList.add('sel'); ex.match.sel = key;
  } else {
    if (ex.match.sel === null) return;
    const leftKey = ex.match.sel, leftEl = document.querySelector('#mleft .mitem[data-key="' + leftKey + '"]');
    if (key === leftKey) {
      el.classList.add('mdone'); if (leftEl) leftEl.classList.add('mdone');
      el.classList.remove('sel'); if (leftEl) leftEl.classList.remove('sel');
      ex.match.sel = null; ex.match.matched++;
      if (ex.match.matched >= ex.match.total) showFeedback(true, G.levels[ex.id].exercises[ex.i].explain);
    } else {
      el.classList.add('shake'); ex.mistakes++;
      setTimeout(() => el.classList.remove('shake'), 420);
      if (leftEl) leftEl.classList.remove('sel'); ex.match.sel = null;
    }
  }
}
function showFeedback(ok, explain) {
  document.getElementById('exfb').innerHTML =
    `<div class="fb ${ok ? 'fbok' : 'fbno'}">${m5('sm')}<div><b>${ok ? '答对啦！🎉' : '没关系，记一下就好～'}</b><br>${explain}</div></div>
     <button class="cta" data-act="exnext">继续 →</button>`;
}
function finishLevel() {
  const stars = ex.mistakes === 0 ? 3 : (ex.mistakes <= 2 ? 2 : 1);
  const firstClear = !gs.done[ex.id];
  gs.done[ex.id] = Math.max(gs.done[ex.id] || 0, stars);
  if (firstClear) gs.xp = (gs.xp || 0) + 20;
  gsave();
  go('result', { id: ex.id, stars: stars, mistakes: ex.mistakes });
}

/* ---------- 结算页 ---------- */
function viewResult(p) {
  const L = G.levels[p.id], allRight = p.mistakes === 0;
  const ids = allLevelIds(), i = ids.indexOf(p.id), n = ids[i + 1];
  const nextReady = n && G.levels[n].ready && isUnlocked(n) ? n : null;
  let stars = '';
  for (let k = 0; k < 3; k++) stars += `<span class="st ${k < p.stars ? '' : 'dim'}" style="animation-delay:${k * 0.15}s">${k < p.stars ? '⭐' : '☆'}</span>`;
  return `<div class="result">
    ${m5('big')}
    <div class="stars">${stars}</div>
    <h2>${allRight ? '全对，太厉害了！' : '通关啦，你真棒！'}</h2>
    <div class="say2">${L.outro || '继续保持，你会越来越懂～'}<br><b>经验 +20 ⭐</b></div>
    ${nextReady ? `<button class="cta" data-act="enter" data-id="${nextReady}">下一关 →</button>` : ''}
    <button class="cta ghost" data-act="map">回地图</button>
  </div>`;
}

/* ---------- 路由 + 底部导航 ---------- */
let cur = { view: 'home' };
function go(view, param) { cur = { view: view, param: param }; render(); }
function render() {
  const frame = document.querySelector('.app-frame');
  frame.classList.toggle('gimmersive', cur.view === 'level' || cur.view === 'result' || cur.view === 'intro');
  document.querySelectorAll('.gtab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === cur.view));
  const html = cur.view === 'intro' ? viewIntro() : cur.view === 'home' ? viewHome() : cur.view === 'map' ? viewMap()
    : cur.view === 'profile' ? viewProfile() : cur.view === 'level' ? viewLevel(cur.param) : viewResult(cur.param);
  app.innerHTML = '<div class="gview">' + html + '</div>';
  app.scrollTop = 0;
  if (cur.view === 'level') startLevel(cur.param);
  if (cur.view === 'intro') setupIntroSwipe();
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'enter') go('level', el.dataset.id);
  else if (a === 'map') go('map');
  else if (a === 'gotab') go(el.dataset.tab);
  else if (a === 'pick') pick(+el.dataset.i);
  else if (a === 'exnext') { ex.i++; renderExercise(); }
  else if (a === 'm') matchTap(el);
  else if (a === 'intro-next') { if (introI < SLIDES.length - 1) { introI++; render(); } else finishIntro(); }
  else if (a === 'intro-skip') finishIntro();
});
document.getElementById('gnav').addEventListener('click', (e) => { const b = e.target.closest('.gtab'); if (b) go(b.dataset.tab); });

/* ---------- 启动：从主页进入 ---------- */
recordDay();
go(gs.onboarded ? 'home' : 'intro');
