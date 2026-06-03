/* =========================================================
   主程序：负责页面切换、音频播放、小测验、把进度存到本机
   （中文注释解释每段在做什么，方便你以后自己看）
   ========================================================= */

// 课程数据来自 data.js（LESSONS、MODULES、COURSE 都是 data.js 里定义的全局变量，直接用即可）
const app = document.getElementById('app'); // 主内容区（也是滚动容器）

/* ---------- 1) 本机存储：把学习进度/收藏存在浏览器里 ---------- */
const KEY = 'aedu_v1';
function load() {
  // 默认结构，读不到就用空的
  const base = { completed: [], favorites: [], quizScores: {}, visitDays: [], lastLessonId: null, audioPos: {} };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { return base; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
let state = load();

// 记录“今天来过”，用于统计学习天数
function recordToday() {
  const d = new Date();
  const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  state.visitDays = state.visitDays || [];
  if (!state.visitDays.includes(k)) { state.visitDays.push(k); save(); }
}

/* ---------- 2) 小工具函数 ---------- */
function getLesson(id) { return LESSONS[id]; }
function getModule(mid) { return MODULES.find((m) => m.id === mid); }
function modDone(mid) { return getModule(mid).lessons.filter((id) => state.completed.includes(id)).length; }
function modPct(mid) { const m = getModule(mid); return Math.round((modDone(mid) / m.lessons.length) * 100); }

// 把秒数格式化成 “分:秒”
function fmt(s) { s = Math.max(0, Math.floor(s || 0)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }

// 找“今天推荐学”的那一节：第一节没学完的已上线课
function nextLesson() {
  for (let i = 1; i <= COURSE.total; i++) { const id = 'l' + i; if (LESSONS[id].ready && !state.completed.includes(id)) return id; }
  for (let i = 1; i <= COURSE.total; i++) { if (LESSONS['l' + i].ready) return 'l' + i; }
  return 'l1';
}
// 找当前这节之后下一节“已上线”的课
function findNextReady(id) {
  for (let i = getLesson(id).index + 1; i <= COURSE.total; i++) { if (LESSONS['l' + i].ready) return 'l' + i; }
  return null;
}

// 轻提示气泡
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// 画一个圆形进度环（SVG）
function ring(pct, size, sw) {
  size = size || 54; sw = sw || 6;
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc062"/><stop offset="1" stop-color="#ff8a5b"/></linearGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#f1e6db" stroke-width="${sw}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
}

// 一些图标
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"/></svg>';
const ICON_PLAY_SM = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICON_HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.3C5 7.9 6.8 6 9 6c1.5 0 2.5.8 3 1.7C12.5 6.8 13.5 6 15 6c2.2 0 4 1.9 4 4.7C19 15.6 12 20 12 20Z"/></svg>';

/* ---------- 3) 各个页面的内容（返回 HTML 字符串） ---------- */

// 今日页
function viewToday() {
  const rec = getLesson(nextLesson());
  const days = state.visitDays.length;
  const last = (state.lastLessonId && LESSONS[state.lastLessonId] && LESSONS[state.lastLessonId].ready) ? LESSONS[state.lastLessonId] : null;
  return `
  <div class="topbar">
    <div class="brand"><span class="dot">☀️</span>AI 编程随身学</div>
    <span class="streak">🔥 已学习 ${days} 天</span>
  </div>
  <div class="hero">
    <span class="mins">今天学 <b>${rec.duration}</b> 分钟</span>
    <h2>${rec.title}</h2>
    <p>${rec.oneLine || '每天一点点，慢慢你就懂了。'}</p>
    <div class="cta-row">
      <button class="btn btn-light" data-action="open-lesson" data-id="${rec.id}">${ICON_PLAY_SM} 开始听课</button>
      <button class="btn btn-ghost" data-action="open-lesson" data-id="${rec.id}">文字阅读</button>
    </div>
  </div>
  ${last ? `<div class="card continue" data-action="open-lesson" data-id="${last.id}">
      <div class="ring">${ring(modPct(last.moduleId), 46, 5)}</div>
      <div class="info"><div class="lbl">继续学习</div><div class="ttl">${last.title}</div></div>
      <div class="go">›</div>
    </div>` : ''}
  <div class="scenes">
    <div class="scene" data-action="open-lesson" data-id="${rec.id}"><div class="emo">🏃</div><div class="t">跑步听</div><div class="s">5-8 分钟</div></div>
    <div class="scene" data-action="open-lesson" data-id="${rec.id}"><div class="emo">🚌</div><div class="t">通勤读</div><div class="s">图文版</div></div>
    <div class="scene" data-action="go" data-go="favorites"><div class="emo">🌙</div><div class="t">睡前复习</div><div class="s">看收藏</div></div>
  </div>`;
}

// 课程页
function viewCourses() {
  let html = `<h1 class="page-title">全部课程</h1>`;
  MODULES.forEach((m) => {
    const done = modDone(m.id), total = m.lessons.length, pct = modPct(m.id);
    html += `<div class="module">
      <div class="module-head">
        <div class="module-ico">${m.icon}</div>
        <div><div class="m-ttl">${m.title}</div><div class="m-sub">${m.intro}</div></div>
      </div>
      <div class="module-prog"><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="prog-meta"><span>共 ${total} 节</span><span>已学 ${done}/${total}</span></div></div>`;
    m.lessons.forEach((id) => {
      const L = LESSONS[id], isDone = state.completed.includes(id);
      const click = L.ready ? `data-action="open-lesson" data-id="${id}"` : `data-action="toast" data-msg="这节课内容还在整理中，敬请期待～"`;
      html += `<div class="lesson-row ${isDone ? 'done' : ''} ${L.ready ? '' : 'locked'}" ${click}>
        <div class="num">${isDone ? '✓' : L.index}</div>
        <div class="lr-main"><div class="lr-ttl">${L.title}</div><div class="lr-sub">${L.ready ? (L.duration + ' 分钟 · 可学习') : '内容整理中'}</div></div>
        <div class="lr-tag ${L.ready ? 'ready' : ''}">${L.ready ? '可学' : '待补'}</div>
      </div>`;
    });
    html += `</div>`;
  });
  return html;
}

// 收藏页
function viewFavorites() {
  let html = `<h1 class="page-title">我的收藏</h1>`;
  const favs = state.favorites.map((id) => LESSONS[id]).filter(Boolean);
  if (!favs.length) {
    return html + `<div class="empty"><div class="emo">🌼</div><h3>还没有收藏</h3><p>在课程里点一下爱心，<br>把重要的内容收藏到这里复习吧。</p></div>`;
  }
  favs.forEach((L) => {
    html += `<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;cursor:pointer" data-action="open-lesson" data-id="${L.id}">
      <div class="module-ico" style="width:40px;height:40px;font-size:20px;border-radius:12px">${getModule(L.moduleId).icon}</div>
      <div style="flex:1;min-width:0"><div class="lr-ttl">${L.title}</div><div class="lr-sub">${getModule(L.moduleId).title}</div></div>
      <button class="btn" style="background:#fff0f1;color:var(--rose);width:34px;height:34px;padding:0;font-size:15px" data-action="remove-fav" data-id="${L.id}">✕</button>
    </div>`;
  });
  return html;
}

// 我的页
function viewProfile() {
  const days = state.visitDays.length, done = state.completed.length, pct = Math.round((done / COURSE.total) * 100);
  return `<h1 class="page-title">我的</h1>
  <div class="stat-grid">
    <div class="stat"><div class="v">${days}</div><div class="k">学习天数</div></div>
    <div class="stat"><div class="v">${done}</div><div class="k">完成课程</div></div>
  </div>
  <div class="card" style="margin:14px 0"><div class="ring-wrap">${ring(pct, 72, 8)}<div class="ring-txt"><div class="big">${pct}%</div><div class="small">总进度 · 共 ${COURSE.total} 节课</div></div></div></div>
  <div class="menu">
    <div class="menu-item" data-action="go" data-go="favorites"><span class="mi-emo">💛</span><span class="mi-t">我的收藏</span><span class="mi-go">${state.favorites.length} 个 ›</span></div>
    <div class="menu-item" data-action="toast" data-msg="学习历史功能后续上线～"><span class="mi-emo">🕒</span><span class="mi-t">学习历史</span><span class="mi-go">›</span></div>
    <div class="menu-item" data-action="toast" data-msg="设置功能后续上线～"><span class="mi-emo">⚙️</span><span class="mi-t">设置</span><span class="mi-go">›</span></div>
  </div>
  <p style="text-align:center;color:var(--ink-faint);font-size:12px;margin-top:18px">进度保存在本机 · 第一版试用</p>`;
}

// 课程学习页
function viewLesson(id) {
  const L = getLesson(id), m = getModule(L.moduleId), faved = state.favorites.includes(id);
  let body;
  if (L.ready) {
    body = `<div class="audio" id="audio">
        <button class="audio-btn" data-action="toggle-audio" aria-label="播放">${ICON_PLAY}</button>
        <div class="audio-main">
          <div class="audio-track" id="audioTrack"><div class="audio-bar"><div class="audio-fill" id="audioFill"></div></div></div>
          <div class="audio-meta"><span id="audioCur">0:00</span><span id="audioDur">${L.duration}:00</span></div>
        </div>
      </div>
      <div class="lesson-body">${L.body.map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="block example"><h3>🍜 真实例子</h3><p style="font-size:14.5px;line-height:1.8;color:#4f4138">${L.example}</p></div>
      <div class="block keypoints"><h3>本节重点</h3><ul>${L.keypoints.map((k) => `<li>${k}</li>`).join('')}</ul></div>
      <div class="block pitfalls"><h3>常见误区</h3><ul>${L.pitfalls.map((k) => `<li>${k}</li>`).join('')}</ul></div>
      <div class="lesson-actions">
        <button class="fav-btn ${faved ? 'on' : ''}" data-action="toggle-fav" data-id="${id}" aria-label="收藏">${ICON_HEART}</button>
        <button class="btn btn-primary" data-action="start-quiz" data-id="${id}">做 3 道小测验 →</button>
      </div>`;
  } else {
    body = `<div class="coming"><div class="emo">✍️</div><p>这节课的内容正在整理中，<br>很快就和你见面～</p></div>`;
  }
  return `<div class="lesson-top">
      <button class="back-btn" data-action="back">‹</button>
      <span class="crumb">${m.icon} ${m.title}</span>
    </div>
    <h1 class="lesson-h1">${L.title}</h1>
    ${L.oneLine ? `<div class="oneliner">${L.oneLine}</div>` : ''}
    ${body}`;
}

// 小测验页（外壳，题目由 initQuiz 填充）
function viewQuiz(id) {
  const L = getLesson(id);
  return `<div class="lesson-top">
      <button class="back-btn" data-action="open-lesson" data-id="${id}">‹</button>
      <span class="crumb">小测验 · ${L.title}</span>
    </div>
    <div id="quizArea"></div>`;
}

/* ---------- 4) 小测验逻辑 ---------- */
let quiz = null;
function initQuiz(id) { quiz = { id, idx: 0, correct: 0 }; renderQuizStep(); }
function renderQuizStep() {
  const L = getLesson(quiz.id), area = document.getElementById('quizArea');
  if (!area) return;
  if (quiz.idx >= L.quiz.length) { renderQuizResult(); return; }
  const q = L.quiz[quiz.idx], total = L.quiz.length, pct = Math.round((quiz.idx / total) * 100);
  area.innerHTML = `<div class="quiz-progress">第 ${quiz.idx + 1} / ${total} 题</div>
    <div class="quiz-bar"><i style="width:${pct}%"></i></div>
    <div class="quiz-q">${q.q}</div>
    <div id="opts">${q.options.map((o, i) => `<div class="opt" data-action="quiz-pick" data-i="${i}"><span class="mark">${String.fromCharCode(65 + i)}</span><span>${o}</span></div>`).join('')}</div>
    <div id="quizFb"></div>`;
}
function quizPick(i) {
  const L = getLesson(quiz.id), q = L.quiz[quiz.idx], opts = document.querySelectorAll('#opts .opt');
  opts.forEach((el) => el.classList.add('disabled'));
  opts[q.answer].classList.add('correct');
  const right = i === q.answer;
  if (right) quiz.correct++; else opts[i].classList.add('wrong');
  const last = quiz.idx === L.quiz.length - 1;
  document.getElementById('quizFb').innerHTML =
    `<div class="explain"><b>${right ? '答对了 🎉' : '再想想 💡'}</b><br>${q.explain}</div>
     <button class="btn btn-primary" style="margin-top:14px;width:100%" data-action="quiz-next">${last ? '查看结果 →' : '下一题 →'}</button>`;
}
function quizNext() { quiz.idx++; renderQuizStep(); }
function renderQuizResult() {
  const L = getLesson(quiz.id), area = document.getElementById('quizArea');
  // 记录这节课已完成 + 成绩
  if (!state.completed.includes(quiz.id)) state.completed.push(quiz.id);
  state.quizScores = state.quizScores || {};
  state.quizScores[quiz.id] = { correct: quiz.correct, total: L.quiz.length };
  save();
  const nextId = findNextReady(quiz.id), allRight = quiz.correct === L.quiz.length;
  area.innerHTML = `<div class="result">
    <div class="badge">${allRight ? '🌟' : '🎉'}</div>
    <h2>${allRight ? '全对，太厉害了！' : '完成啦，你真棒！'}</h2>
    <div class="score">答对 ${quiz.correct} / ${L.quiz.length} 题</div>
    <div class="tip">${L.ending || '继续保持，每天一点点，你会越来越懂。'}</div>
    ${nextId ? `<button class="btn btn-primary" style="width:100%" data-action="open-lesson" data-id="${nextId}">学下一节 →</button>` : ''}
    <button class="btn" style="width:100%;margin-top:12px;background:#fff;color:var(--primary-deep);box-shadow:var(--shadow-sm)" data-action="go" data-go="courses">回到课程列表</button>
  </div>`;
}

/* ---------- 5) 音频播放器：按需创建 + 可拖动进度 + 断点续听 ---------- */
let audioObj = null;                 // 当前音频对象（点播放/拖动时才创建）
let audioFor = null;                 // 当前音频属于哪一节
let lastPosSave = 0;                 // 上次保存进度的时间戳（节流用）
let seekState = { dragging: false }; // 是否正在拖动进度条

function showAudioOff() {
  const box = document.getElementById('audio');
  if (!box) return;
  box.classList.add('audio--off');
  const btn = box.querySelector('.audio-btn'); if (btn) btn.innerHTML = ICON_PLAY;
  const main = box.querySelector('.audio-main');
  if (main) main.innerHTML = '<div class="audio-hint">🎧 配音即将上线（用 AI 生成 mp3 放进 audio 文件夹即可）</div>';
}
function setPlayIcon(playing) {
  const box = document.getElementById('audio'); if (!box) return;
  const btn = box.querySelector('.audio-btn'); if (btn) btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  box.classList.toggle('is-playing', playing);
}
function updateAudioUI() {
  if (!audioObj) return;
  const f = document.getElementById('audioFill'), c = document.getElementById('audioCur');
  if (f && audioObj.duration) f.style.width = (audioObj.currentTime / audioObj.duration * 100) + '%';
  if (c) c.textContent = fmt(audioObj.currentTime);
}
// 按需创建音频对象，并接好各种事件（含断点续听）
function ensureAudio(id) {
  if (audioObj && audioFor === id) return audioObj;
  if (audioObj) audioObj.pause();
  const L = getLesson(id);
  audioObj = new Audio();
  audioFor = id;
  audioObj.preload = 'metadata';
  audioObj.src = L.audio;
  audioObj.addEventListener('error', showAudioOff); // 没有 mp3 时优雅提示
  audioObj.addEventListener('loadedmetadata', () => {
    const d = document.getElementById('audioDur');
    if (d && isFinite(audioObj.duration)) d.textContent = fmt(audioObj.duration);
    const pos = state.audioPos[id];                 // 断点续听：恢复上次进度
    if (pos && pos < audioObj.duration - 1) { audioObj.currentTime = pos; updateAudioUI(); }
  });
  audioObj.addEventListener('timeupdate', () => {
    updateAudioUI();
    const now = Date.now();                          // 节流保存进度（约每 3 秒）
    if (now - lastPosSave > 3000) { lastPosSave = now; state.audioPos[id] = audioObj.currentTime; save(); }
  });
  audioObj.addEventListener('ended', () => {
    setPlayIcon(false);
    delete state.audioPos[id]; save();               // 听完清除断点，下次从头
    toast('听完啦，做几道小测验巩固一下吧～');
  });
  return audioObj;
}
function toggleAudio() {
  const id = current.param, box = document.getElementById('audio');
  if (!getLesson(id) || !box) return;
  if (box.classList.contains('audio--off')) { toast('音频即将上线，先看文字版吧～'); return; }
  const a = ensureAudio(id);
  if (a.paused) a.play().then(() => setPlayIcon(true)).catch(showAudioOff);
  else { a.pause(); setPlayIcon(false); state.audioPos[id] = a.currentTime; save(); }
}
// 拖动/点击进度条跳转
function seekToRatio(ratio) {
  const id = current.param, box = document.getElementById('audio');
  if (!box || box.classList.contains('audio--off')) return;
  const a = ensureAudio(id);
  ratio = Math.max(0, Math.min(1, ratio));
  if (a.duration && isFinite(a.duration)) {
    a.currentTime = ratio * a.duration;
    updateAudioUI();
    state.audioPos[id] = a.currentTime; save();
  } else {
    const f = document.getElementById('audioFill'); if (f) f.style.width = (ratio * 100) + '%';
  }
}
function seekRatio(e) {
  const track = document.getElementById('audioTrack'); if (!track) return 0;
  const rect = track.getBoundingClientRect();
  const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  return rect.width ? (clientX - rect.left) / rect.width : 0;
}
// 学习页渲染后：给进度条接上"按下拖动"，并显示上次进度
function setupSeek(id) {
  const track = document.getElementById('audioTrack');
  if (!track) return;
  track.onmousedown = (e) => { seekState.dragging = true; seekToRatio(seekRatio(e)); };
  track.ontouchstart = (e) => { seekState.dragging = true; seekToRatio(seekRatio(e)); e.preventDefault(); };
  const pos = state.audioPos[id];
  if (pos) { const c = document.getElementById('audioCur'); if (c) c.textContent = fmt(pos); }
}

/* ---------- 6) 收藏开关 ---------- */
function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) { state.favorites.splice(i, 1); toast('已取消收藏'); }
  else { state.favorites.unshift(id); toast('已收藏 💛'); }
  save();
  const btn = document.querySelector(`.fav-btn[data-id="${id}"]`);
  if (btn) btn.classList.toggle('on', state.favorites.includes(id));
}

/* ---------- 7) 页面切换（路由） ---------- */
let current = { view: 'today', param: null };
let lastTab = 'today'; // 记住从哪个标签进的课，返回时回到那里
const MAIN_TABS = ['today', 'courses', 'favorites', 'profile'];

function go(view, param) {
  if (MAIN_TABS.includes(view)) lastTab = view;
  if (view === 'lesson' && param) { state.lastLessonId = param; save(); }
  current = { view, param: param || null };
  render();
}

function render() {
  const v = current.view, p = current.param;
  const frame = document.querySelector('.app-frame');
  // 学习页/测验页全屏沉浸，隐藏底部标签栏
  frame.classList.toggle('immersive', v === 'lesson' || v === 'quiz');
  // 高亮当前标签
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === v));

  let html = '';
  if (v === 'today') html = viewToday();
  else if (v === 'courses') html = viewCourses();
  else if (v === 'favorites') html = viewFavorites();
  else if (v === 'profile') html = viewProfile();
  else if (v === 'lesson') html = viewLesson(p);
  else if (v === 'quiz') html = viewQuiz(p);

  // 离开学习页时，暂停并保存进度（只有真正听了才覆盖，避免把已存进度冲成 0）
  if (v !== 'lesson' && audioObj) { audioObj.pause(); if (audioFor && audioObj.currentTime > 0) { state.audioPos[audioFor] = audioObj.currentTime; save(); } }

  app.innerHTML = '<div class="view">' + html + '</div>';
  app.scrollTop = 0; // 切页后回到顶部

  if (v === 'lesson') setupSeek(p);
  if (v === 'quiz') initQuiz(p);
}

/* ---------- 8) 事件绑定（用“事件委托”统一处理点击） ---------- */
app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action;
  if (a === 'open-lesson') go('lesson', t.dataset.id);
  else if (a === 'start-quiz') go('quiz', t.dataset.id);
  else if (a === 'back') go(lastTab || 'courses');
  else if (a === 'go') go(t.dataset.go);
  else if (a === 'toggle-fav') toggleFav(t.dataset.id);
  else if (a === 'remove-fav') { const id = t.dataset.id, i = state.favorites.indexOf(id); if (i >= 0) state.favorites.splice(i, 1); save(); render(); }
  else if (a === 'toggle-audio') toggleAudio();
  else if (a === 'quiz-pick') quizPick(+t.dataset.i);
  else if (a === 'quiz-next') quizNext();
  else if (a === 'toast') toast(t.dataset.msg);
});

// 底部标签栏点击
document.getElementById('tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (b) go(b.dataset.tab);
});

/* ---------- 9) 启动 ---------- */
// 进度条拖动：移动/松手在整个窗口监听（只注册一次，避免重复堆叠）
window.addEventListener('mousemove', (e) => { if (seekState.dragging) seekToRatio(seekRatio(e)); });
window.addEventListener('mouseup', () => { seekState.dragging = false; });
window.addEventListener('touchmove', (e) => { if (seekState.dragging) { seekToRatio(seekRatio(e)); e.preventDefault(); } }, { passive: false });
window.addEventListener('touchend', () => { seekState.dragging = false; });

recordToday();
go('today');
