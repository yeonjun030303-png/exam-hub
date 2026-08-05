/* exam-core.js — 프로필/목표량/모의고사/등급/AI진단 공용 엔진
   모든 데이터는 이 브라우저(localStorage)에만 저장됩니다. 서버/로그인 계정은 없습니다. */
(function () {
  const LS = {
    profile: 'ec_profile_v1',
    goals: 'ec_goals_v1',
    progress: 'ec_progress_v1',
    mock: (appId) => `ec_mock_${appId}_v1`
  };

  function loadJSON(key, fallback) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function todayStr(d = new Date()) { return d.toISOString().slice(0, 10); }
  function isoWeekKey(d = new Date()) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
    const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((dt - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return `${dt.getUTCFullYear()}-W${week}`;
  }
  function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- 프로필 ---------- */
  function getProfile() {
    return loadJSON(LS.profile, { name: '', emoji: '🙂', color: '#39D8C8', pin: '' });
  }
  function setProfile(p) { saveJSON(LS.profile, p); }

  /* ---------- 목표량 ---------- */
  function getGoals() {
    return loadJSON(LS.goals, {
      daily: 20, weekly: 100, monthly: 300,
      goalPercent: {} // appId -> 0~100 목표 점수(%)
    });
  }
  function setGoals(g) { saveJSON(LS.goals, g); }

  function getProgress() { return loadJSON(LS.progress, {}); } // {date: {appId: n}}
  function recordSolved(appId, n = 1) {
    const p = getProgress();
    const d = todayStr();
    p[d] = p[d] || {};
    p[d][appId] = (p[d][appId] || 0) + n;
    saveJSON(LS.progress, p);
    refreshAllGoalBars();
  }
  function sumProgress(sinceDate) {
    const p = getProgress();
    let total = 0;
    Object.keys(p).forEach(d => {
      if (d >= sinceDate) Object.values(p[d]).forEach(v => total += v);
    });
    return total;
  }
  function sumProgressToday() { return sumProgress(todayStr()); }
  function sumProgressThisWeek() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // 월요일=0
    const monday = new Date(now); monday.setDate(now.getDate() - day);
    return sumProgress(todayStr(monday));
  }
  function sumProgressThisMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return sumProgress(todayStr(first));
  }

  const goalBarEls = [];
  function refreshAllGoalBars() { goalBarEls.forEach(fn => fn()); }

  /* ---------- 모의고사 기록 ---------- */
  function getMockHistory(appId) { return loadJSON(LS.mock(appId), []); }
  function saveMockRound(appId, round) {
    const list = getMockHistory(appId);
    round.round = list.length + 1;
    round.date = new Date().toISOString();
    list.push(round);
    saveJSON(LS.mock(appId), list);
    return round;
  }

  /* ---------- 스타일 주입 (1회) ---------- */
  function injectStyles() {
    if (document.getElementById('ec-styles')) return;
    const css = `
    .ec-goalwrap{margin:14px 0 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:14px;}
    .ec-goalhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
    .ec-goalhead b{font-size:13px;color:var(--text);}
    .ec-goalbtn{font-size:11px;color:var(--cyan);background:transparent;border:1px solid var(--cyan-dim,var(--line));border-radius:20px;padding:5px 10px;cursor:pointer;}
    .ec-goalrow{display:flex;flex-direction:column;gap:2px;margin-bottom:9px;}
    .ec-goalrow:last-child{margin-bottom:0;}
    .ec-goallabel{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);}
    .ec-goaltrack{height:8px;border-radius:6px;background:var(--surface2,var(--line));overflow:hidden;}
    .ec-goalfill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--cyan),var(--d2,#3ED17E));transition:width .4s ease;}
    .ec-modal-overlay{position:fixed;inset:0;background:rgba(4,8,16,.68);z-index:200;display:none;align-items:flex-end;justify-content:center;}
    .ec-modal-overlay.open{display:flex;}
    .ec-modal{width:100%;max-width:420px;background:var(--bg2);border:1px solid var(--line);border-radius:20px 20px 0 0;padding:18px 18px 22px;max-height:85vh;overflow-y:auto;}
    .ec-modal h3{margin:0 0 14px;font-size:15px;}
    .ec-field{margin-bottom:12px;}
    .ec-field label{display:block;font-size:11px;color:var(--muted);margin-bottom:5px;}
    .ec-field input{width:100%;box-sizing:border-box;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 11px;color:var(--text);font-size:14px;}
    .ec-emojirow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
    .ec-emojibtn{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:17px;cursor:pointer;}
    .ec-emojibtn.active{border-color:var(--cyan);background:var(--cyan-dim,rgba(57,216,200,.15));}
    .ec-btnrow{display:flex;gap:8px;margin-top:14px;}
    .ec-btn{flex:1;padding:11px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font-weight:700;font-size:13px;cursor:pointer;}
    .ec-btn.primary{background:var(--cyan);border-color:var(--cyan);color:#052915;}
    .ec-drawersub{font-size:12px;color:var(--muted);line-height:1.6;padding:2px 4px;}
    .ec-gradepill{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;margin-top:6px;}
    .ec-examcard{margin:14px 0;border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:14px;}
    .ec-examcard h4{margin:0 0 4px;font-size:14px;}
    .ec-examcard p{margin:0 0 10px;font-size:11px;color:var(--muted);line-height:1.5;}
    .ec-roundlist{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}
    .ec-roundrow{display:flex;justify-content:space-between;align-items:center;font-size:12px;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;}
    .ec-pass{color:var(--d2,#3ED17E);font-weight:800;}
    .ec-fail{color:var(--d5,#FF4C5E);font-weight:800;}
    .ec-startbtn{width:100%;padding:12px;border-radius:12px;border:none;background:var(--cyan);color:#052915;font-weight:800;font-size:13px;cursor:pointer;}
    .ec-overlay{position:fixed;inset:0;background:var(--bg);z-index:300;display:none;flex-direction:column;overflow-y:auto;}
    .ec-overlay.open{display:flex;}
    .ec-examhead{position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--line);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;z-index:2;}
    .ec-examhead b{font-size:13px;}
    .ec-examhead .ec-timer{font-size:12px;color:var(--muted);}
    .ec-progtrack{height:5px;background:var(--surface2,var(--line));}
    .ec-progfill{height:100%;background:var(--cyan);transition:width .25s;}
    .ec-exambody{padding:20px 18px 90px;max-width:520px;margin:0 auto;width:100%;box-sizing:border-box;}
    .ec-qtag{font-size:11px;color:var(--cyan);font-weight:700;margin-bottom:8px;}
    .ec-qtext{font-size:16px;line-height:1.55;margin-bottom:16px;}
    .ec-opt{display:block;width:100%;text-align:left;padding:13px 14px;margin-bottom:9px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font-size:13.5px;cursor:pointer;}
    .ec-opt.sel{border-color:var(--cyan);background:var(--cyan-dim,rgba(57,216,200,.14));}
    .ec-examfoot{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:8px;z-index:2;}
    .ec-resultwrap{padding:26px 20px 60px;max-width:520px;margin:0 auto;}
    .ec-bignum{font-size:44px;font-weight:900;text-align:center;margin:4px 0;}
    .ec-banner{text-align:center;font-size:22px;font-weight:900;padding:16px;border-radius:16px;margin-bottom:16px;}
    .ec-banner.pass{background:rgba(62,209,126,.14);color:var(--d2,#3ED17E);}
    .ec-banner.fail{background:rgba(255,76,94,.14);color:var(--d5,#FF4C5E);}
    .ec-sec{margin-top:18px;}
    .ec-sec h5{font-size:12px;color:var(--muted);margin:0 0 8px;letter-spacing:.3px;}
    .ec-subjrow{display:flex;justify-content:space-between;font-size:12.5px;padding:8px 0;border-bottom:1px solid var(--line);}
    .ec-feedbox{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;font-size:13px;line-height:1.6;}
    .ec-empty{text-align:center;padding:34px 14px;color:var(--muted);}
    .ec-empty .ico{font-size:38px;margin-bottom:10px;}
    .ec-aibox{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;font-size:12.5px;line-height:1.75;margin-top:10px;white-space:pre-line;}
    `;
    const style = document.createElement('style');
    style.id = 'ec-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- 목표 설정 모달 ---------- */
  function openGoalModal(appId, appLabel) {
    const goals = getGoals();
    const overlay = document.createElement('div');
    overlay.className = 'ec-modal-overlay open';
    overlay.innerHTML = `
      <div class="ec-modal">
        <h3>🎯 목표량 설정</h3>
        <div class="ec-field"><label>하루 목표 문제 수</label><input type="number" id="ecGDay" value="${goals.daily}" min="1"></div>
        <div class="ec-field"><label>일주일 목표 문제 수</label><input type="number" id="ecGWeek" value="${goals.weekly}" min="1"></div>
        <div class="ec-field"><label>한 달 목표 문제 수</label><input type="number" id="ecGMonth" value="${goals.monthly}" min="1"></div>
        ${appId ? `<div class="ec-field"><label>${esc(appLabel)} 모의고사 목표 점수(%)</label><input type="number" id="ecGScore" value="${goals.goalPercent[appId] ?? ''}" placeholder="예: 70" min="0" max="100"></div>` : ''}
        <div class="ec-btnrow">
          <button class="ec-btn" id="ecGCancel">취소</button>
          <button class="ec-btn primary" id="ecGSave">저장</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#ecGCancel').onclick = () => overlay.remove();
    overlay.querySelector('#ecGSave').onclick = () => {
      goals.daily = Math.max(1, parseInt(overlay.querySelector('#ecGDay').value) || goals.daily);
      goals.weekly = Math.max(1, parseInt(overlay.querySelector('#ecGWeek').value) || goals.weekly);
      goals.monthly = Math.max(1, parseInt(overlay.querySelector('#ecGMonth').value) || goals.monthly);
      if (appId) {
        const v = parseFloat(overlay.querySelector('#ecGScore').value);
        if (!isNaN(v)) goals.goalPercent[appId] = Math.max(0, Math.min(100, v));
      }
      setGoals(goals);
      overlay.remove();
      refreshAllGoalBars();
    };
  }

  /* ---------- 목표 바 렌더 ---------- */
  function mountGoalBar(container, appId, appLabel) {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.className = 'ec-goalwrap';
    wrap.innerHTML = `
      <div class="ec-goalhead"><b>🎯 오늘의 목표</b><button class="ec-goalbtn">목표 설정</button></div>
      <div class="ec-goalrow"><div class="ec-goallabel"><span>오늘</span><span class="ec-vd"></span></div><div class="ec-goaltrack"><div class="ec-goalfill" id="ecFillD"></div></div></div>
      <div class="ec-goalrow"><div class="ec-goallabel"><span>이번 주</span><span class="ec-vw"></span></div><div class="ec-goaltrack"><div class="ec-goalfill" id="ecFillW"></div></div></div>
      <div class="ec-goalrow"><div class="ec-goallabel"><span>이번 달</span><span class="ec-vm"></span></div><div class="ec-goaltrack"><div class="ec-goalfill" id="ecFillM"></div></div></div>
    `;
    container.appendChild(wrap);
    wrap.querySelector('.ec-goalbtn').onclick = () => openGoalModal(appId, appLabel);

    function refresh() {
      const g = getGoals();
      const d = sumProgressToday(), w = sumProgressThisWeek(), m = sumProgressThisMonth();
      const set = (vEl, fillEl, val, target) => {
        const pct = Math.min(100, Math.round(val / target * 100));
        wrap.querySelector(vEl).textContent = `${val} / ${target} (${pct}%)`;
        wrap.querySelector(fillEl).style.width = pct + '%';
      };
      set('.ec-vd', '#ecFillD', d, g.daily);
      set('.ec-vw', '#ecFillW', w, g.weekly);
      set('.ec-vm', '#ecFillM', m, g.monthly);
    }
    refresh();
    goalBarEls.push(refresh);
    return wrap;
  }

  /* ---------- 등급 계산 ---------- */
  function computeGrade(appId, cfg) {
    const hist = getMockHistory(appId);
    if (!hist.length) return null;
    const recent = hist.slice(-5);
    const avgMargin = recent.reduce((s, r) => s + (r.overallPercent - cfg.passOverallPercent), 0) / recent.length;
    let tier;
    if (avgMargin >= 30) tier = { label: '🏆 최상위 안정권', color: 'var(--d2,#3ED17E)' };
    else if (avgMargin >= 20) tier = { label: '✅ 안정권', color: 'var(--d2,#3ED17E)' };
    else if (avgMargin >= -10) tier = { label: '⚠️ 합격 경계(불안정)', color: 'var(--d3,#F4C94A)' };
    else if (avgMargin >= -30) tier = { label: '📘 보완 필요', color: 'var(--d4,#FF9142)' };
    else tier = { label: '📕 집중 학습 필요', color: 'var(--d5,#FF4C5E)' };
    return { tier, avgMargin, count: hist.length };
  }

  /* ---------- AI(규칙기반) 진단 ---------- */
  function diagnose(appId, cfg) {
    const hist = getMockHistory(appId);
    if (!hist.length) return null;
    const last = hist[hist.length - 1];
    const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
    let lines = [];
    lines.push(`총 ${hist.length}회차 모의고사를 응시했어요. 최근(${last.round}회차) 점수는 ${last.overallPercent.toFixed(1)}%였어요.`);

    if (prev) {
      const dropped = [], improved = [];
      Object.keys(last.bySubject).forEach(k => {
        const diff = last.bySubject[k].percent - (prev.bySubject[k]?.percent ?? last.bySubject[k].percent);
        if (diff <= -10) dropped.push(`${k}(${diff.toFixed(0)}%p↓)`);
        else if (diff >= 10) improved.push(`${k}(+${diff.toFixed(0)}%p)`);
      });
      if (dropped.length) lines.push(`지난 회차보다 떨어진 파트: ${dropped.join(', ')} — 다시 개념 정리가 필요해 보여요.`);
      if (improved.length) lines.push(`지난 회차보다 좋아진 파트: ${improved.join(', ')} — 이 흐름을 유지해보세요.`);
      if (!dropped.length && !improved.length) lines.push('지난 회차와 비교해 큰 변화 없이 안정적으로 유지되고 있어요.');
    } else {
      lines.push('아직 회차가 1개뿐이라 회차 간 비교는 다음 응시부터 볼 수 있어요.');
    }

    // 전체 약점 파트
    const sorted = Object.entries(last.bySubject).sort((a, b) => a[1].percent - b[1].percent);
    if (sorted.length) {
      const weakest = sorted[0];
      lines.push(`가장 약한 파트는 "${weakest[0]}"(${weakest[1].percent.toFixed(0)}%)예요. 이 파트 위주로 오답노트를 다시 훑어보길 추천해요.`);
    }

    // 반복적으로 오래 걸리는 파트(전 회차 slowItems 취합)
    const slowSubjCount = {};
    hist.forEach(r => (r.slowItems || []).forEach(si => { slowSubjCount[si.subject] = (slowSubjCount[si.subject] || 0) + 1; }));
    const slowSorted = Object.entries(slowSubjCount).sort((a, b) => b[1] - a[1]);
    if (slowSorted.length && slowSorted[0][1] >= 2) {
      lines.push(`"${slowSorted[0][0]}" 파트 문제에서 여러 회차에 걸쳐 반복적으로 시간이 오래 걸렸어요. 해당 파트는 속도 훈련이 필요해요.`);
    }

    // 추세
    if (hist.length >= 3) {
      const first3 = hist.slice(0, Math.min(3, hist.length)).reduce((s, r) => s + r.overallPercent, 0) / Math.min(3, hist.length);
      const last3 = hist.slice(-Math.min(3, hist.length)).reduce((s, r) => s + r.overallPercent, 0) / Math.min(3, hist.length);
      if (last3 - first3 >= 5) lines.push('초반 회차 대비 전체적으로 점수가 상승하는 추세예요. 잘 하고 있어요.');
      else if (first3 - last3 >= 5) lines.push('초반 회차 대비 최근 점수가 다소 낮아지는 추세예요. 페이스 조절이 필요할 수 있어요.');
    }

    return lines.join('\n\n');
  }

  /* ---------- 드로어(설정) 확장: 프로필/목표/성적 ---------- */
  function mountDrawerExtras(drawer, anchorEl, appId, appLabel, cfg) {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="drawerAcc">
        <button class="drawerAccBtn" id="ecProfBtn"><span>👤 프로필</span><span class="chev">▾</span></button>
        <div class="drawerAccPanel" id="ecProfPanel"><div class="ec-drawersub" id="ecProfBody" style="padding:10px 4px;"></div></div>
      </div>
      <div class="drawerAcc">
        <button class="drawerAccBtn" id="ecGoalDrawerBtn"><span>🎯 목표 설정</span><span class="chev">▾</span></button>
        <div class="drawerAccPanel" id="ecGoalDrawerPanel"><div class="ec-drawersub" style="padding:10px 4px;">하루/일주일/한달 목표${appId ? ' 및 모의고사 목표 점수' : ''}를 설정해요.<br><button class="ec-btn primary" id="ecOpenGoalModal" style="margin-top:8px;width:100%;">설정 열기</button></div></div>
      </div>
      ${appId ? `
      <div class="drawerAcc">
        <button class="drawerAccBtn" id="ecGradeBtn"><span>📊 모의고사 성적</span><span class="chev">▾</span></button>
        <div class="drawerAccPanel" id="ecGradePanel"><div class="ec-drawersub" id="ecGradeBody" style="padding:10px 4px;"></div></div>
      </div>` : ''}
    `;
    drawer.insertBefore(wrap, anchorEl);

    // 아코디언 토글 공통
    wrap.querySelectorAll('.drawerAccBtn').forEach(btn => {
      btn.onclick = () => {
        const panel = btn.nextElementSibling;
        const willOpen = !panel.classList.contains('open');
        wrap.querySelectorAll('.drawerAccPanel').forEach(p => p.classList.remove('open'));
        wrap.querySelectorAll('.drawerAccBtn').forEach(b => b.classList.remove('open'));
        if (willOpen) { panel.classList.add('open'); btn.classList.add('open'); }
      };
    });

    // 프로필
    function renderProfile() {
      const p = getProfile();
      const body = wrap.querySelector('#ecProfBody');
      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:44px;height:44px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:22px;">${p.emoji}</div>
          <div><b style="color:var(--text);">${esc(p.name) || '이름 없음'}</b><br><span style="font-size:11px;">이 기기에만 저장돼요(서버 계정 아님)</span></div>
        </div>
        <button class="ec-btn" id="ecEditProfile" style="width:100%;">프로필 수정</button>
      `;
      body.querySelector('#ecEditProfile').onclick = openProfileModal;
    }
    function openProfileModal() {
      const p = getProfile();
      const emojis = ['🙂','😎','🐣','🦊','🐯','📚','🚑','🈶','💻','🔥'];
      const overlay = document.createElement('div');
      overlay.className = 'ec-modal-overlay open';
      overlay.innerHTML = `
        <div class="ec-modal">
          <h3>👤 프로필 수정</h3>
          <div class="ec-field"><label>이름(닉네임)</label><input id="ecPName" value="${esc(p.name)}" placeholder="닉네임 입력"></div>
          <div class="ec-field"><label>아바타</label><div class="ec-emojirow">${emojis.map(e => `<button class="ec-emojibtn${e===p.emoji?' active':''}" data-e="${e}">${e}</button>`).join('')}</div></div>
          <div class="ec-btnrow"><button class="ec-btn" id="ecPCancel">취소</button><button class="ec-btn primary" id="ecPSave">저장</button></div>
        </div>`;
      document.body.appendChild(overlay);
      let sel = p.emoji;
      overlay.querySelectorAll('.ec-emojibtn').forEach(b => b.onclick = () => {
        overlay.querySelectorAll('.ec-emojibtn').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); sel = b.dataset.e;
      });
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#ecPCancel').onclick = () => overlay.remove();
      overlay.querySelector('#ecPSave').onclick = () => {
        p.name = overlay.querySelector('#ecPName').value.trim();
        p.emoji = sel;
        setProfile(p);
        overlay.remove();
        renderProfile();
      };
    }
    renderProfile();

    wrap.querySelector('#ecOpenGoalModal').onclick = () => openGoalModal(appId, appLabel);

    // 모의고사 성적/등급/AI진단
    if (appId) {
      function renderGrade() {
        const body = wrap.querySelector('#ecGradeBody');
        const hist = getMockHistory(appId);
        if (!hist.length) {
          body.innerHTML = `<div class="ec-empty"><div class="ico">📭</div><b style="color:var(--text);">정보가 없어요</b><br>모의고사를 안 봤으면<br>모의고사를 최소 1회 이상 진행해주세요.</div>`;
          return;
        }
        const g = computeGrade(appId, cfg);
        body.innerHTML = `
          <div>현재 등급<br><span class="ec-gradepill" style="background:${g.tier.color}22;color:${g.tier.color};">${g.tier.label}</span></div>
          <div style="margin:10px 0;">최근 응시: ${hist.length}회차 · 최근 점수 ${hist[hist.length-1].overallPercent.toFixed(1)}%</div>
          <button class="ec-btn primary" id="ecAiBtn" style="width:100%;">🤖 AI로 진단하기</button>
          <div id="ecAiOut"></div>
        `;
        body.querySelector('#ecAiBtn').onclick = () => {
          const txt = diagnose(appId, cfg);
          body.querySelector('#ecAiOut').innerHTML = `<div class="ec-aibox">${esc(txt)}</div>`;
        };
      }
      renderGrade();
      wrap.querySelector('#ecGradeBtn').addEventListener('click', renderGrade);
    }
  }

  /* ---------- 모의고사 엔진 ---------- */
  function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]); }

  function sampleExam(cfg) {
    const items = [];
    cfg.subjectsMock.forEach(sub => {
      const pool = cfg.bank.filter(it => cfg.getItemSubject(it) === sub.key);
      const picked = shuffle(pool).slice(0, Math.min(sub.count, pool.length));
      picked.forEach(it => items.push({ item: it, subject: sub.key, subjectLabel: sub.label || sub.key }));
    });
    return shuffle(items);
  }

  function mountMockExamSection(container, cfg) {
    injectStyles();
    const card = document.createElement('div');
    card.className = 'ec-examcard';
    const totalQ = cfg.subjectsMock.reduce((s, x) => s + x.count, 0);
    card.innerHTML = `
      <h4>📝 모의고사</h4>
      <p>${esc(cfg.appLabel)} 실제 시험 구성(총 ${totalQ}문항: ${cfg.subjectsMock.map(s=>`${s.key} ${s.count}`).join(' · ')})을 그대로 반영한 실전 모의고사예요. 제출 전까지 정답이 보이지 않아요.${cfg.note ? `<br>※ ${esc(cfg.note)}` : ''}</p>
      <div class="ec-roundlist" id="ecRoundList"></div>
      <button class="ec-startbtn" id="ecStartBtn"></button>
    `;
    container.appendChild(card);

    function refreshRounds() {
      const hist = getMockHistory(cfg.appId);
      const list = card.querySelector('#ecRoundList');
      list.innerHTML = hist.length ? hist.slice().reverse().map(r =>
        `<div class="ec-roundrow"><span>${r.round}회차 · ${new Date(r.date).toLocaleDateString('ko-KR')}</span><span class="${r.pass?'ec-pass':'ec-fail'}">${r.overallPercent.toFixed(1)}% · ${r.pass?'합격':'불합격'}</span></div>`
      ).join('') : `<div style="font-size:11.5px;color:var(--muted);">아직 응시 기록이 없어요.</div>`;
      card.querySelector('#ecStartBtn').textContent = `${hist.length + 1}회차 모의고사 시작하기`;
    }
    refreshRounds();
    card.querySelector('#ecStartBtn').onclick = () => runExam(cfg, refreshRounds);
    return card;
  }

  function runExam(cfg, onDone) {
    const examItems = sampleExam(cfg);
    let idx = 0;
    const answers = new Array(examItems.length).fill(null); // {optIdx, correct, ms}
    let qStart = performance.now();

    const overlay = document.createElement('div');
    overlay.className = 'ec-overlay open';
    overlay.innerHTML = `
      <div class="ec-examhead"><b>${esc(cfg.appLabel)} 모의고사</b><span class="ec-timer" id="ecQIdx"></span></div>
      <div class="ec-progtrack"><div class="ec-progfill" id="ecProg"></div></div>
      <div class="ec-exambody" id="ecQBody"></div>
      <div class="ec-examfoot">
        <button class="ec-btn" id="ecPrev">이전</button>
        <button class="ec-btn primary" id="ecNext">다음</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function renderQ() {
      const ex = examItems[idx];
      const qa = cfg.getQA(ex.item);
      overlay.querySelector('#ecQIdx').textContent = `${idx + 1} / ${examItems.length}`;
      overlay.querySelector('#ecProg').style.width = `${(idx / examItems.length) * 100}%`;
      const body = overlay.querySelector('#ecQBody');
      const savedSel = answers[idx]?.optIdx;
      body.innerHTML = `
        <div class="ec-qtag">${esc(ex.subjectLabel)}</div>
        <div class="ec-qtext">${esc(qa.q)}</div>
        ${qa.o.map((o, i) => `<button class="ec-opt${savedSel===i?' sel':''}" data-i="${i}">${esc(o)}</button>`).join('')}
      `;
      body.querySelectorAll('.ec-opt').forEach(btn => btn.onclick = () => {
        body.querySelectorAll('.ec-opt').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        const elapsed = performance.now() - qStart;
        answers[idx] = { optIdx: parseInt(btn.dataset.i), correct: parseInt(btn.dataset.i) === qa.a, ms: (answers[idx]?.ms || 0) + elapsed, item: ex.item, subject: ex.subject, subjectLabel: ex.subjectLabel, q: qa.q };
      });
      overlay.querySelector('#ecPrev').disabled = idx === 0;
      overlay.querySelector('#ecNext').textContent = idx === examItems.length - 1 ? '제출하기' : '다음';
    }
    renderQ();

    overlay.querySelector('#ecPrev').onclick = () => { if (idx > 0) { idx--; qStart = performance.now(); renderQ(); } };
    overlay.querySelector('#ecNext').onclick = () => {
      if (idx < examItems.length - 1) { idx++; qStart = performance.now(); renderQ(); }
      else confirmSubmit();
    };

    function confirmSubmit() {
      const answeredCount = answers.filter(Boolean).length;
      const msg = answeredCount < examItems.length
        ? `${examItems.length - answeredCount}문제를 안 풀었어요. 그래도 제출할까요?`
        : '답안을 제출할까요? 제출 후에는 수정할 수 없어요.';
      if (confirm(msg)) finishExam();
    }

    function finishExam() {
      const bySubject = {};
      cfg.subjectsMock.forEach(s => bySubject[s.key] = { correct: 0, total: 0, label: s.label || s.key, timeSum: 0, timeCount: 0 });
      let totalCorrect = 0;
      answers.forEach((a, i) => {
        const sub = examItems[i].subject;
        bySubject[sub].total++;
        if (a) {
          bySubject[sub].timeSum += a.ms; bySubject[sub].timeCount++;
          if (a.correct) { totalCorrect++; bySubject[sub].correct++; }
        }
      });
      Object.values(bySubject).forEach(s => { s.percent = s.total ? (s.correct / s.total * 100) : 0; });
      const overallPercent = totalCorrect / examItems.length * 100;
      const subjectPassOk = cfg.passSubjectPercent
        ? Object.values(bySubject).every(s => s.percent >= cfg.passSubjectPercent)
        : true;
      const pass = overallPercent >= cfg.passOverallPercent && subjectPassOk;

      // 느린 문항 top5 (답한 것 중)
      const answeredList = answers.filter(Boolean);
      const avgMs = answeredList.reduce((s, a) => s + a.ms, 0) / (answeredList.length || 1);
      const slowItems = answeredList
        .filter(a => a.ms > avgMs * 1.5)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 5)
        .map(a => ({ q: a.q.slice(0, 40), subject: a.subjectLabel, sec: (a.ms / 1000).toFixed(1) }));

      const round = { bySubject, overallPercent, pass, totalCorrect, totalCount: examItems.length, slowItems, goalPercent: getGoals().goalPercent[cfg.appId] };
      saveMockRound(cfg.appId, round);
      recordSolved(cfg.appId, examItems.length);

      overlay.remove();
      showResult(round, cfg, onDone);
    }
  }

  function showResult(round, cfg, onDone) {
    const goals = getGoals();
    const goalPercent = goals.goalPercent[cfg.appId] ?? cfg.passOverallPercent;
    const diff = round.overallPercent - goalPercent;
    let feedback;
    if (diff >= 30) feedback = `목표 점수(${goalPercent}%) 대비 +${diff.toFixed(1)}%p — 안정권이에요! 이 페이스라면 실전에서도 여유 있게 합격할 수 있어요.`;
    else if (diff >= 20) feedback = `목표 점수(${goalPercent}%) 대비 +${diff.toFixed(1)}%p — 안정적이에요. 지금처럼 유지해보세요.`;
    else if (diff >= -10) feedback = `목표 점수(${goalPercent}%) 대비 ${diff>=0?'+':''}${diff.toFixed(1)}%p — 목표에 근접했지만 아직 불안정한 구간이에요. 조금 더 공부가 필요해요.`;
    else feedback = `목표 점수(${goalPercent}%) 대비 ${diff.toFixed(1)}%p — 목표보다 많이 낮아요. 약점 파트 위주로 보완이 필요해요.`;

    const weakest = Object.entries(round.bySubject).sort((a,b)=>a[1].percent-b[1].percent)[0];

    const overlay = document.createElement('div');
    overlay.className = 'ec-overlay open';
    overlay.innerHTML = `
      <div class="ec-examhead"><b>${round.round}회차 결과</b><button class="ec-btn" id="ecCloseResult" style="padding:6px 12px;">닫기</button></div>
      <div class="ec-resultwrap">
        <div class="ec-banner ${round.pass?'pass':'fail'}">${round.pass?'✅ 합격':'❌ 불합격'}</div>
        <div class="ec-bignum">${round.overallPercent.toFixed(1)}%</div>
        <div style="text-align:center;color:var(--muted);font-size:12px;margin-bottom:6px;">정답 ${round.totalCorrect} / ${round.totalCount}</div>
        <div class="ec-feedbox">${esc(feedback)}</div>

        <div class="ec-sec">
          <h5>과목별 점수</h5>
          ${Object.entries(round.bySubject).map(([k,v])=>`<div class="ec-subjrow"><span>${esc(v.label)}</span><span>${v.correct}/${v.total} (${v.percent.toFixed(0)}%)</span></div>`).join('')}
        </div>

        <div class="ec-sec">
          <h5>약점 분석</h5>
          <div class="ec-feedbox">가장 약한 파트는 "${esc(weakest[0])}"(${weakest[1].percent.toFixed(0)}%)예요. 해당 파트 오답노트를 다시 확인해보세요.</div>
        </div>

        ${round.slowItems.length ? `
        <div class="ec-sec">
          <h5>시간이 오래 걸린 문항</h5>
          <div class="ec-feedbox">${round.slowItems.map(s=>`• [${esc(s.subject)}] ${esc(s.q)}… — ${s.sec}초`).join('<br>')}</div>
        </div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#ecCloseResult').onclick = () => { overlay.remove(); if (onDone) onDone(); };
  }

  /* ---------- 공개 API ---------- */
  window.ExamCore = {
    init(cfg) {
      injectStyles();
      // 목표 바 (필터 영역 위)
      if (cfg.goalBarTarget) mountGoalBar(cfg.goalBarTarget, cfg.appId, cfg.appLabel);
      // 모의고사 섹션
      if (cfg.examSectionTarget && cfg.subjectsMock) mountMockExamSection(cfg.examSectionTarget, cfg);
      // 드로어 확장
      if (cfg.drawer && cfg.drawerAnchor) mountDrawerExtras(cfg.drawer, cfg.drawerAnchor, cfg.subjectsMock ? cfg.appId : null, cfg.appLabel, cfg);
    },
    recordSolved,
    getGoals, setGoals, getProfile, setProfile,
    getMockHistory, computeGrade,
    mountGoalBar, mountDrawerExtras
  };
})();
