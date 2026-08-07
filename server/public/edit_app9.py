# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app9.py)
# 목적: 카드 학습(홈) 화면 상단에 소과목/난이도 선택 필터 추가

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

# 1) CSS: 필터바 스타일 추가
old_css = """.flip-card .opts .qd-opt{cursor:pointer;}
.flip-card .opts .qd-opt.correct-ans,.flip-card .opts .qd-opt.mine-wrong{cursor:default;}"""
new_css = """.flip-card .opts .qd-opt{cursor:pointer;}
.flip-card .opts .qd-opt.correct-ans,.flip-card .opts .qd-opt.mine-wrong{cursor:default;}
.fc-filter{display:flex;gap:8px;margin-bottom:10px;}
.fc-filter select{flex:1;background:var(--surface2);border:1px solid var(--line);color:var(--text);
  border-radius:10px;padding:8px 10px;font-size:12.5px;font-weight:600;}"""
assert html.count(old_css) == 1, "CSS 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_css, new_css); changed += 1

# 2) HTML: 필터바 마크업 추가 (flip-card 카드 위)
old_html = """    <div class="card flip-card" id="flipCardBox">
      <div class="subj" id="fcSubj"></div>"""
new_html = """    <div class="fc-filter">
      <select id="fcFilterSubj" onchange="Home.applyFilter()"></select>
      <select id="fcFilterDiff" onchange="Home.applyFilter()"></select>
    </div>
    <div class="card flip-card" id="flipCardBox">
      <div class="subj" id="fcSubj"></div>"""
assert html.count(old_html) == 1, "홈 화면 HTML 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_html, new_html); changed += 1

# 3) JS: Home 객체 전체 교체 (필터 로직 추가)
old_js = """const Home = {
  pool:[], idx:0, picked:null,
  init(){
    const meta = SUBJECTS_META[App.profile.subject];
    this.pool = meta.data().Q;
    this.idx = LS_get('eh_home_idx_'+App.profile.subject, 0);
    if(this.idx >= this.pool.length) this.idx = 0;
    this.render();
    // 서버에 저장된 마지막 카드 위치가 있으면(다른 기기 등) 그걸로 이어서 보기
    if(window.socket){
      socket.emit('cardProgress:get', { subject: App.profile.subject }, (res)=>{
        if(res && res.success && typeof res.index === 'number' && res.index !== this.idx && res.index < this.pool.length){
          this.idx = res.index;
          LS_set('eh_home_idx_'+App.profile.subject, this.idx);
          this.render();
        }
      });
    }
  },
  render(){"""
new_js = """const Home = {
  fullPool:[], pool:[], idx:0, picked:null, filterSubj:'all', filterDiff:'all',
  init(){
    const meta = SUBJECTS_META[App.profile.subject];
    this.fullPool = meta.data().Q;
    this.filterSubj = 'all';
    this.filterDiff = 'all';
    this.buildFilterOptions();
    this.pool = this.fullPool;
    this.idx = LS_get('eh_home_idx_'+App.profile.subject, 0);
    if(this.idx >= this.pool.length) this.idx = 0;
    this.render();
    // 서버에 저장된 마지막 카드 위치가 있으면(다른 기기 등) 그걸로 이어서 보기
    if(window.socket){
      socket.emit('cardProgress:get', { subject: App.profile.subject }, (res)=>{
        if(res && res.success && typeof res.index === 'number' && res.index !== this.idx && res.index < this.pool.length){
          this.idx = res.index;
          LS_set('eh_home_idx_'+App.profile.subject, this.idx);
          this.render();
        }
      });
    }
  },
  buildFilterOptions(){
    const subjs = Array.from(new Set(this.fullPool.map(q=>q.s)));
    const diffs = Array.from(new Set(this.fullPool.map(q=>q.d))).sort((a,b)=>a-b);
    const subjSel = document.getElementById('fcFilterSubj');
    subjSel.innerHTML = '<option value="all">소과목 전체</option>' + subjs.map(s=>`<option value="${s}">${s}</option>`).join('');
    const diffSel = document.getElementById('fcFilterDiff');
    diffSel.innerHTML = '<option value="all">난이도 전체</option>' + diffs.map(d=>`<option value="${d}">난이도 ${d}</option>`).join('');
  },
  applyFilter(){
    this.filterSubj = document.getElementById('fcFilterSubj').value;
    this.filterDiff = document.getElementById('fcFilterDiff').value;
    this.pool = this.fullPool.filter(q=>
      (this.filterSubj==='all' || q.s===this.filterSubj) &&
      (this.filterDiff==='all' || String(q.d)===this.filterDiff)
    );
    if(this.pool.length===0){
      this.pool = this.fullPool;
      alert('해당 조건의 문제가 없어 전체로 표시할게요.');
    }
    this.idx = 0;
    this.render();
    this._save();
  },
  render(){"""
assert html.count(old_js) == 1, "Home 객체 JS 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_js, new_js); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/3 블록 수정됨")