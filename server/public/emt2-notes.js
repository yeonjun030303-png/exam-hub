/* 응급구조사 2급 필기 암기노트 화면 - 데이터: emt2-notes-data.js */
(function () {
  var D = window.EMT2_NOTES; if (!D) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var ls = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var sv = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var done = ls('nt_done', {}), star = ls('nt_star', {});
  var S = ls('nt_state', { period: 1, kind: 'note', filter: 'all' });
  S.q = ''; var hide = false;
  var book = function () { return D.books.filter(function (b) { return b.period === S.period && b.kind === S.kind; })[0]; };
  var saveS = function () { sv('nt_state', { period: S.period, kind: S.kind, filter: S.filter }); };

  var st = document.createElement('style');
  st.textContent =
    '.ntseg{display:flex;gap:6px;margin:0 0 10px}.ntseg button{flex:1;padding:10px 6px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font-size:14px;font-weight:800;cursor:pointer}' +
    '.ntseg button.on{border-color:var(--cyan);color:var(--text);background:var(--cyan-dim)}' +
    '.ntsearch{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font-size:14px;margin-bottom:10px}' +
    '.ntbar{height:8px;border-radius:8px;background:var(--line);overflow:hidden;margin:6px 0 4px}.ntbar i{display:block;height:100%;background:var(--green,#34c759);width:0}' +
    '.ntsub{color:var(--muted);font-size:12.5px;line-height:1.6}' +
    '.ntgrp{margin:16px 2px 6px;font-size:12px;font-weight:800;color:var(--cyan);letter-spacing:.2px}' +
    '.ntrow{display:flex;align-items:center;gap:8px;padding:0 0 0 12px;margin-bottom:6px;border-radius:12px;border:1px solid var(--line);background:var(--surface)}' +
    '.ntrow.done{border-color:var(--green,#34c759)}' +
    '.ntrow .tt{flex:1;text-align:left;padding:13px 0;font-size:14px;line-height:1.45;font-weight:700;color:var(--text);background:none;border:0;cursor:pointer}' +
    '.ntrow .ib{width:42px;align-self:stretch;background:none;border:0;font-size:18px;cursor:pointer;color:var(--muted)}' +
    '.ntrow.done .ib.ck{color:var(--green,#34c759)}.ntrow .ib.st.on{color:var(--amber)}' +
    '.nthead{font-size:17px;font-weight:800;line-height:1.5;margin:4px 0 10px}' +
    '.ntp{font-size:14px;line-height:1.75;margin:8px 0}' +
    '.ntwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:10px 0;border:1px solid var(--line);border-radius:10px}' +
    '.nttb{border-collapse:collapse;width:100%;font-size:13px;line-height:1.55}' +
    '.nttb th{background:var(--cyan-dim);color:var(--text);font-weight:800;position:sticky;top:0}' +
    '.nttb th,.nttb td{padding:8px 9px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);vertical-align:top;min-width:72px;text-align:left}' +
    '.nttb td:first-child{font-weight:700;min-width:84px}' +
    '.nttb td.h{color:transparent;background:var(--line);cursor:pointer;user-select:none}.nttb td.h.on{color:inherit;background:none}' +
    '.ntimg{width:100%;border-radius:10px;border:1px solid var(--line);margin:10px 0}' +
    '.ntnav{display:flex;gap:8px;margin:14px 0}.ntnav .btn{flex:1;padding:11px;font-size:13px}' +
    '.ntrow mark,.ntp mark,.nttb mark{background:var(--amber);color:#000;border-radius:3px;padding:0 1px}';
  document.head.appendChild(st);

  function H(h) { $('ntRoot').innerHTML = h; window.scrollTo(0, 0); }
  function matchSec(s, q) {
    if (!q) return true; q = q.toLowerCase();
    if (s.t.toLowerCase().indexOf(q) >= 0) return true;
    return s.b.some(function (b) {
      if (b.t === 'p') return b.v.toLowerCase().indexOf(q) >= 0;
      if (b.t === 'tb') return b.v.some(function (r) { return r.join(' ').toLowerCase().indexOf(q) >= 0; });
      return false;
    });
  }
  function hl(s) {
    var e = esc(s); if (!S.q) return e;
    var q = esc(S.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return e.replace(new RegExp(q, 'gi'), function (m) { return '<mark>' + m + '</mark>'; }); } catch (x) { return e; }
  }
  function isContent(s) { return s.b.length > 0; }

  window.NT = {
    home: function () {
      var b = book(), secs = b.sections, tot = 0, dn = 0;
      secs.forEach(function (s) { if (isContent(s)) { tot++; if (done[s.id]) dn++; } });
      var pct = tot ? Math.round(dn * 100 / tot) : 0;
      var rows = '', lastGrp = '';
      secs.forEach(function (s, i) {
        if (!isContent(s)) { if (!S.q && S.filter === 'all') rows += '<div class="ntgrp">' + hl(s.t) + '</div>'; return; }
        if (S.filter === 'star' && !star[s.id]) return;
        if (S.filter === 'todo' && done[s.id]) return;
        if (!matchSec(s, S.q)) return;
        rows += '<div class="ntrow ' + (done[s.id] ? 'done' : '') + '"><button class="tt" onclick="NT.open(' + i + ')">' + hl(s.t) + '</button>' +
          '<button class="ib st ' + (star[s.id] ? 'on' : '') + '" onclick="NT.tgl(\'star\',\'' + s.id + '\')">' + (star[s.id] ? '★' : '☆') + '</button>' +
          '<button class="ib ck" onclick="NT.tgl(\'done\',\'' + s.id + '\')">' + (done[s.id] ? '✅' : '⬜') + '</button></div>';
      });
      if (!rows) rows = '<div class="ntsub" style="margin:20px 0;text-align:center">해당하는 항목이 없어요.</div>';
      var seg = function (k, v, label, cur) { return '<button class="' + (cur === v ? 'on' : '') + '" onclick="NT.set(\'' + k + '\',' + (typeof v === 'number' ? v : '\'' + v + '\'') + ')">' + label + '</button>'; };
      H('<div class="pagehead">📒 암기노트</div>' +
        '<div class="ntseg">' + seg('period', 1, '1교시', S.period) + seg('period', 2, '2교시', S.period) + '</div>' +
        '<div class="ntseg">' + seg('kind', 'note', '암기노트(전체)', S.kind) + seg('kind', 'sum', '요약본(핵심)', S.kind) + '</div>' +
        '<input class="ntsearch" id="ntQ" placeholder="🔍 검색 (예: 산소통, 60일, START)" value="' + esc(S.q) + '" oninput="NT.search(this.value)">' +
        '<div class="ntsub">외웠어요 ' + dn + ' / ' + tot + ' (' + pct + '%) · ⬜ 눌러 체크, ☆ 눌러 북마크</div><div class="ntbar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ntseg" style="margin-top:8px">' + seg('filter', 'all', '전체', S.filter) + seg('filter', 'todo', '안 외운 것', S.filter) + seg('filter', 'star', '★ 북마크', S.filter) + '</div>' +
        '<div id="ntList">' + rows + '</div>');
      if (S.q) { var el = $('ntQ'); if (el) { el.focus(); var l = el.value.length; try { el.setSelectionRange(l, l); } catch (e) {} } }
    },
    set: function (k, v) { S[k] = v; saveS(); this.home(); },
    search: function (v) { S.q = v.trim(); var y = window.scrollY; this.home(); window.scrollTo(0, y); },
    tgl: function (m, id) { var o = m === 'star' ? star : done; o[id] ? delete o[id] : o[id] = 1; sv(m === 'star' ? 'nt_star' : 'nt_done', o); var y = window.scrollY; this.home(); window.scrollTo(0, y); },
    open: function (i) {
      var b = book(), s = b.sections[i]; this.cur = i;
      var body = s.b.map(function (x) {
        if (x.t === 'p') return '<div class="ntp">' + hl(x.v) + '</div>';
        if (x.t === 'img') return '<img class="ntimg" src="' + x.v + '" alt="">';
        var rows = x.v.map(function (r, ri) {
          return '<tr>' + r.map(function (c, ci) {
            if (ri === 0) return '<th>' + hl(c) + '</th>';
            return '<td' + (hide && ci > 0 ? ' class="h" onclick="this.classList.toggle(\'on\')"' : '') + '>' + hl(c) + '</td>';
          }).join('') + '</tr>';
        }).join('');
        return '<div class="ntwrap"><table class="nttb">' + rows + '</table></div>';
      }).join('');
      var prev = this.adj(i, -1), next = this.adj(i, 1);
      H('<button class="btn ghost" style="margin-bottom:10px" onclick="NT.home()">← 목록</button>' +
        '<div class="nthead">' + esc(s.t) + '</div>' +
        '<div class="ntnav"><button class="btn ghost" onclick="NT.hide()">' + (hide ? '👀 전체 보이기' : '🙈 표 가리기(탭해서 확인)') + '</button>' +
        '<button class="btn ' + (done[s.id] ? 'ghost' : 'primary') + '" onclick="NT.fin(' + i + ')">' + (done[s.id] ? '✅ 외움(해제)' : '외웠어요') + '</button></div>' +
        body +
        '<div class="ntnav">' + (prev >= 0 ? '<button class="btn ghost" onclick="NT.open(' + prev + ')">← 이전</button>' : '') +
        (next >= 0 ? '<button class="btn primary" onclick="NT.open(' + next + ')">다음 →</button>' : '') + '</div>');
    },
    adj: function (i, d) { var s = book().sections; for (var j = i + d; j >= 0 && j < s.length; j += d) if (isContent(s[j])) return j; return -1; },
    hide: function () { hide = !hide; this.open(this.cur); },
    fin: function (i) { var id = book().sections[i].id; done[id] ? delete done[id] : done[id] = 1; sv('nt_done', done); this.open(i); }
  };

  function sync() {
    try {
      var b = $('navNotes'); if (!b) return;
      var s = (typeof App !== 'undefined' && App.profile) ? App.profile.subject : null;
      b.style.display = (s === 'emt2') ? '' : 'none';
    } catch (e) {}
  }
  window.syncNotesNav = sync; sync(); setInterval(sync, 1500);
})();
