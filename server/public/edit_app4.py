# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app4.py)
# 목적: 홈(카드 넘기기) 화면에 보기(선택지)를 항상 표시하고, 클릭 시 정답/오답 색으로 표시

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

# 1) CSS: flip-card 안에 옵션 스타일 추가 + justify-content 수정
old_css = """.flip-card{min-height:220px;display:flex;flex-direction:column;justify-content:center;}
.flip-card .qnum{color:var(--muted);font-size:11.5px;margin-bottom:6px;}
.flip-card .subj{color:var(--cyan);font-size:11.5px;font-weight:700;margin-bottom:6px;}
.flip-card .qtext{font-size:16px;font-weight:600;line-height:1.55;margin-bottom:14px;}
.flip-card .ans{background:var(--bg2);border-left:3px solid var(--cyan);border-radius:0 12px 12px 0;
  padding:12px 13px;font-size:13px;line-height:1.6;display:none;}
.flip-card .ans.show{display:block;}"""
new_css = """.flip-card{min-height:220px;display:flex;flex-direction:column;justify-content:flex-start;}
.flip-card .qnum{color:var(--muted);font-size:11.5px;margin-bottom:6px;}
.flip-card .subj{color:var(--cyan);font-size:11.5px;font-weight:700;margin-bottom:6px;}
.flip-card .qtext{font-size:16px;font-weight:600;line-height:1.55;margin-bottom:14px;}
.flip-card .opts .qd-opt{cursor:pointer;}
.flip-card .opts .qd-opt.correct-ans,.flip-card .opts .qd-opt.mine-wrong{cursor:default;}
.flip-card .ans{background:var(--bg2);border-left:3px solid var(--cyan);border-radius:0 12px 12px 0;
  padding:12px 13px;font-size:13px;line-height:1.6;display:none;margin-top:10px;}
.flip-card .ans.show{display:block;}"""
assert html.count(old_css) == 1, "CSS 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_css, new_css); changed += 1

# 2) HTML: 홈 화면에 옵션 컨테이너 추가, 뒤집기 버튼 제거
old_html = """    <div class="card flip-card" id="flipCardBox">
      <div class="subj" id="fcSubj"></div>
      <div class="qnum" id="fcNum"></div>
      <div class="qtext" id="fcQ"></div>
      <div class="ans" id="fcAns"></div>
    </div>
    <div class="flip-nav">
      <button class="btn ghost" onclick="Home.prev()">◀ 이전</button>
      <button class="btn ghost" onclick="Home.flip()">뒤집기</button>
      <button class="btn primary" onclick="Home.next()">다음 ▶</button>
    </div>"""
new_html = """    <div class="card flip-card" id="flipCardBox">
      <div class="subj" id="fcSubj"></div>
      <div class="qnum" id="fcNum"></div>
      <div class="qtext" id="fcQ"></div>
      <div class="opts" id="fcOpts"></div>
      <div class="ans" id="fcAns"></div>
    </div>
    <div class="flip-nav">
      <button class="btn ghost" onclick="Home.prev()">◀ 이전</button>
      <button class="btn primary" onclick="Home.next()">다음 ▶</button>
    </div>"""
assert html.count(old_html) == 1, "홈 화면 HTML 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_html, new_html); changed += 1

# 3) JS: Home 객체 - 보기 항상 렌더 + 클릭 시 채점
old_js = """const Home = {
  pool:[], idx:0, flipped:false,
  init(){
    const meta = SUBJECTS_META[App.profile.subject];
    this.pool = meta.data().Q;
    this.idx = LS_get('eh_home_idx_'+App.profile.subject, 0);
    if(this.idx >= this.pool.length) this.idx = 0;
    this.render();
  },
  render(){
    const q = this.pool[this.idx];
    document.getElementById('fcSubj').textContent = q.s;
    document.getElementById('fcNum').textContent = `${this.idx+1} / ${this.pool.length}`;
    document.getElementById('fcQ').textContent = q.q;
    const ansBox = document.getElementById('fcAns');
    ansBox.innerHTML = `<b style="color:var(--green)">정답: ${q.o[q.a]}</b><br><br>${q.e}`;
    ansBox.classList.remove('show');
    this.flipped = false;
  },
  flip(){ this.flipped = !this.flipped; document.getElementById('fcAns').classList.toggle('show', this.flipped); },
  next(){ this.idx = (this.idx+1) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); },
  prev(){ this.idx = (this.idx-1+this.pool.length) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); }
};"""
new_js = """const Home = {
  pool:[], idx:0, picked:null,
  init(){
    const meta = SUBJECTS_META[App.profile.subject];
    this.pool = meta.data().Q;
    this.idx = LS_get('eh_home_idx_'+App.profile.subject, 0);
    if(this.idx >= this.pool.length) this.idx = 0;
    this.render();
  },
  render(){
    const q = this.pool[this.idx];
    document.getElementById('fcSubj').textContent = q.s;
    document.getElementById('fcNum').textContent = `${this.idx+1} / ${this.pool.length}`;
    document.getElementById('fcQ').textContent = q.q;
    this.picked = null;
    const optsBox = document.getElementById('fcOpts');
    optsBox.innerHTML = '';
    q.o.forEach((opt,i)=>{
      const div = document.createElement('div');
      div.className = 'qd-opt';
      div.innerHTML = `<b>${i+1}.</b> ${opt}`;
      div.onclick = ()=>this.pick(i);
      optsBox.appendChild(div);
    });
    const ansBox = document.getElementById('fcAns');
    ansBox.innerHTML = '';
    ansBox.classList.remove('show');
  },
  pick(i){
    if(this.picked !== null) return;
    this.picked = i;
    const q = this.pool[this.idx];
    const optsBox = document.getElementById('fcOpts');
    Array.from(optsBox.children).forEach((div,idx)=>{
      div.onclick = null;
      if(idx === q.a) div.classList.add('correct-ans');
      else if(idx === i) div.classList.add('mine-wrong');
    });
    const ansBox = document.getElementById('fcAns');
    ansBox.innerHTML = `<b style="color:var(--green)">정답: ${q.o[q.a]}</b><br><br>${q.e}`;
    ansBox.classList.add('show');
  },
  next(){ this.idx = (this.idx+1) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); },
  prev(){ this.idx = (this.idx-1+this.pool.length) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); }
};"""
assert html.count(old_js) == 1, "Home 객체 JS 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_js, new_js); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/3 블록 수정됨")