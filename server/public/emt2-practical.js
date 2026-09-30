/* 응급구조사 2급 실기 화면 - 데이터: emt2-practical-data.js */
(function () {
  var D = window.EMT2_PRACTICAL; if (!D) return;
  var KEY = 'pr_weak', sel = new Set(D.items.map(function (i) { return i.id; })), timer = null;
  var $ = function (id) { return document.getElementById(id); };
  var weak = function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  var saveWeak = function (w) { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch (e) {} };
  var shuf = function (a) { return a.map(function (x) { return [Math.random(), x]; }).sort(function (p, q) { return p[0] - q[0]; }).map(function (x) { return x[1]; }); };
  var fmt = function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var byId = function (id) { return D.items.filter(function (i) { return i.id === id; })[0]; };
  var chosen = function () { return D.items.filter(function (i) { return sel.has(i.id); }); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  var st = document.createElement('style');
  st.textContent = '.prsub{color:var(--muted);font-size:12.5px;margin:6px 0 12px;line-height:1.6}' +
    '.prrow{display:flex;gap:8px;margin-bottom:10px}.prrow .btn{flex:1;padding:9px;font-size:13px}' +
    '.prchips{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}' +
    '.prchip{display:flex;justify-content:space-between;align-items:center;text-align:left;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font-size:14px;font-weight:700;cursor:pointer}' +
    '.prchip small{font-size:11px;font-weight:600}.prchip.on{border-color:var(--cyan);color:var(--text);background:var(--cyan-dim)}' +
    '.prmodes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.prmodes .btn{padding:14px 8px;font-size:14px}' +
    '.prbig{font-size:17px;line-height:1.6;font-weight:700;margin:14px 0}' +
    '.prtag{display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:20px;margin:0 6px 6px 0}' +
    '.prsay{background:#5A4A10;color:var(--amber)}.prcue{background:#1E3A5A;color:#8CC4FF}' +
    '.prstep{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:11px 12px;margin-bottom:6px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font-size:14px;line-height:1.5;cursor:pointer}' +
    '.prstep.ok{border-color:var(--green);background:#123A2A}.prstep .n{color:var(--cyan);font-weight:800;min-width:22px}' +
    '.prstep.bad{border-color:var(--red)}.prtime{font-size:26px;font-weight:800;color:var(--cyan);text-align:center}.prtime.low{color:var(--red)}';
  document.head.appendChild(st);

  function H(h) { $('prRoot').innerHTML = h; window.scrollTo(0, 0); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function backBtn() { return '<button class="btn ghost" style="margin-bottom:10px" onclick="PR.home()">← 실기 메뉴</button>'; }

  window.PR = {
    rnd: true,
    home: function () {
      stop();
      var wc = Object.keys(weak()).length;
      H('<div class="pagehead">🩺 응급구조사 실기</div><div class="prsub">' + esc(D.version) + ' 기준 · 연습할 항목을 고르세요</div>' +
        '<div class="prrow"><button class="btn ghost" onclick="PR.pick(\'all\')">전체</button><button class="btn ghost" onclick="PR.pick(\'p1\')">실기1</button><button class="btn ghost" onclick="PR.pick(\'p2\')">실기2</button></div>' +
        '<div class="prchips">' + D.items.map(function (i) {
          return '<button class="prchip ' + (sel.has(i.id) ? 'on' : '') + '" onclick="PR.tog(\'' + i.id + '\')"><span>' + esc(i.name) + '</span><small>' + D.groups[i.group] + ' · ' + i.steps.length + '단계 · ' + fmt(i.sec) + '</small></button>';
        }).join('') + '</div>' +
        '<label class="prsub" style="display:block"><input type="checkbox" ' + (this.rnd ? 'checked' : '') + ' onchange="PR.rnd=this.checked"> 카드 랜덤 순서</label>' +
        '<div class="prmodes"><button class="btn primary" onclick="PR.cards()">📇 단계 카드</button><button class="btn primary" onclick="PR.order()">🔀 순서 맞추기</button>' +
        '<button class="btn primary" onclick="PR.sim()">⏱ 타이머 시뮬</button><button class="btn ghost" onclick="PR.cards(true)">🎯 약점만 (' + wc + ')</button></div>' +
        '<div class="prsub" style="margin-top:14px">선택: ' + sel.size + '개 항목 · 실기 시험은 손으로 하는 시험이라 실습도 꼭 같이 하세요.</div>');
    },
    pick: function (g) { sel = new Set(D.items.filter(function (i) { return g === 'all' || i.group === g; }).map(function (i) { return i.id; })); this.home(); },
    tog: function (id) { sel.has(id) ? sel.delete(id) : sel.add(id); this.home(); },
    need: function () { if (!sel.size) { alert('항목을 하나 이상 선택하세요'); return false; } return true; },

    /* 단계 카드 */
    cards: function (weakOnly) {
      if (!this.need()) return;
      var w = weak(), deck = [];
      chosen().forEach(function (it) { it.steps.forEach(function (t, k) { if (!weakOnly || w[it.id + ':' + (k + 1)]) deck.push({ it: it, n: k + 1 }); }); });
      if (!deck.length) { alert('약점으로 표시된 단계가 아직 없어요'); return; }
      if (this.rnd) deck = shuf(deck);
      this.deck = deck; this.i = 0; this.h = 0; this.show = false; this.card();
    },
    card: function () {
      var c = this.deck[this.i];
      if (!c) { H(backBtn() + '<div class="prbig">🎉 카드 끝! (' + this.deck.length + '장)</div>'); return; }
      var it = c.it, n = c.n, cue = it.cue && it.cue[n], say = it.say && it.say[n], t = it.steps[n - 1];
      var prev = n > 1 ? it.steps[n - 2] : '(시작)';
      var body = this.show ? '<div class="prbig" style="color:var(--cyan)">' + esc(t) + '</div>' + (say ? '<span class="prtag prsay">🗣 말하기: ' + esc(say) + '</span>' : '') :
        '<div class="prsub">이전 단계: ' + esc(prev) + '</div><div class="prbig">다음 단계는?</div>' + (this.h ? '<div class="prbig" style="color:var(--amber)">' + esc(t.slice(0, this.h === 1 ? 2 : 6)) + '…</div>' : '');
      H(backBtn() + '<div class="card"><div class="prsub">' + esc(it.name) + ' · ' + n + '/' + it.steps.length + '단계 · 카드 ' + (this.i + 1) + '/' + this.deck.length + '</div>' +
        (cue ? '<span class="prtag prcue">📢 ' + esc(cue) + '</span>' : '') + body + '</div>' +
        (this.show ? '<div class="prrow"><button class="btn ghost" onclick="PR.rate(1)">😵 헷갈려</button><button class="btn primary" onclick="PR.rate(0)">😀 알아</button></div>' :
          '<div class="prrow"><button class="btn ghost" onclick="PR.h=Math.min(2,PR.h+1);PR.card()">💡 힌트</button><button class="btn primary" onclick="PR.show=true;PR.card()">정답 보기</button></div>'));
    },
    rate: function (bad) {
      var c = this.deck[this.i], w = weak(), k = c.it.id + ':' + c.n;
      bad ? w[k] = 1 : delete w[k]; saveWeak(w);
      this.i++; this.h = 0; this.show = false; this.card();
    },

    /* 순서 맞추기 */
    order: function () {
      if (!this.need()) return;
      var it = shuf(chosen())[0];
      this.o = { it: it, list: shuf(it.steps.map(function (t, i) { return { t: t, i: i }; })), next: 0, wrong: 0, bad: -1 };
      this.ord();
    },
    ord: function () {
      var o = this.o, it = o.it;
      var done = it.steps.slice(0, o.next).map(function (t, i) { return '<div class="prstep ok"><span class="n">' + (i + 1) + '</span><span>' + esc(t) + '</span></div>'; }).join('');
      if (o.next >= it.steps.length) { H(backBtn() + '<div class="prbig">✅ ' + esc(it.name) + ' 완료! 실수 ' + o.wrong + '번</div>' + done + '<button class="btn primary block" onclick="PR.order()">다음 문제</button>'); return; }
      var left = o.list.filter(function (x) { return x.i >= o.next; }).map(function (x) {
        return '<button class="prstep ' + (o.bad === x.i ? 'bad' : '') + '" onclick="PR.tap(' + x.i + ')"><span>' + esc(x.t) + '</span></button>';
      }).join('');
      H(backBtn() + '<div class="prsub">' + esc(it.name) + ' · 순서대로 탭하세요 (' + o.next + '/' + it.steps.length + ') · 실수 ' + o.wrong + '</div>' + done + '<div class="prsub">▼ 다음 단계를 고르세요</div>' + left);
    },
    tap: function (i) { var o = this.o; if (i === o.next) { o.next++; o.bad = -1; } else { o.wrong++; o.bad = i; } this.ord(); },

    /* 타이머 시뮬레이터 */
    sim: function () {
      if (!this.need()) return;
      var it = shuf(chosen())[0];
      this.s = { it: it, left: it.sec, chk: {} }; this.simView();
      var me = this; stop();
      timer = setInterval(function () { me.s.left--; var el = $('prClock'); if (el) { el.textContent = fmt(Math.max(0, me.s.left)); el.classList.toggle('low', me.s.left <= 30); } if (me.s.left <= 0) me.end(); }, 1000);
    },
    simView: function () {
      var s = this.s, it = s.it;
      H(backBtn().replace('PR.home()', 'PR.home()') + '<div class="prsub">' + esc(it.name) + ' — 말로 하면서 단계를 수행하고, 한 단계씩 탭해서 체크하세요</div><div class="prtime" id="prClock">' + fmt(s.left) + '</div>' +
        it.steps.map(function (t, k) {
          var n = k + 1, cue = it.cue && it.cue[n], say = it.say && it.say[n];
          return (cue ? '<div class="prtag prcue">📢 ' + esc(cue) + '</div>' : '') + '<button class="prstep ' + (s.chk[n] ? 'ok' : '') + '" onclick="PR.chk(' + n + ')"><span class="n">' + n + '</span><span>' + esc(t) + (say ? ' <b style="color:var(--amber)">🗣</b>' : '') + '</span></button>';
        }).join('') + '<button class="btn primary block" style="margin-top:10px" onclick="PR.end()">종료하고 결과 보기</button>');
    },
    chk: function (n) { var y = window.scrollY; this.s.chk[n] = !this.s.chk[n]; this.simView(); window.scrollTo(0, y); },
    end: function () {
      stop(); var s = this.s, it = s.it, w = weak(), miss = [];
      it.steps.forEach(function (t, k) { if (!s.chk[k + 1]) { miss.push(k + 1); w[it.id + ':' + (k + 1)] = 1; } });
      saveWeak(w);
      H(backBtn() + '<div class="prbig">' + esc(it.name) + '</div><div class="prsub">사용 시간 ' + fmt(it.sec - Math.max(0, s.left)) + ' / ' + fmt(it.sec) + ' · 체크 ' + (it.steps.length - miss.length) + '/' + it.steps.length + '단계</div>' +
        (miss.length ? '<div class="prsub">놓친 단계 (약점에 저장됨)</div>' + miss.map(function (n) { return '<div class="prstep bad"><span class="n">' + n + '</span><span>' + esc(it.steps[n - 1]) + '</span></div>'; }).join('') : '<div class="prbig">🎉 전 단계 완료!</div>') +
        '<button class="btn primary block" onclick="PR.sim()">다시 하기</button>');
    }
  };

  /* Nav 연결 + 응급구조사 과목일 때만 탭 표시 */
  var g = window.Nav && Nav.go;
  if (g) Nav.go = function (v) { if (v !== 'practical') stop(); g.apply(this, arguments); if (v === 'practical') PR.home(); };
  function sync() { var b = $('navPractical'), s = window.App && App.profile && App.profile.subject; if (b) b.style.display = (s && String(s).indexOf('emt') === 0) ? '' : 'none'; }
  sync(); setInterval(sync, 1500);
})();
