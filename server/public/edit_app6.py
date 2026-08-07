# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app6.py)
# 목적: 카드 학습(홈) 화면의 마지막으로 본 카드 인덱스를 서버(cardProgress:get/save)와 동기화
#      -> 다른 기기/브라우저에서도 이어서 볼 수 있게 함

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

old_js = """const Home = {
  pool:[], idx:0, picked:null,
  init(){
    const meta = SUBJECTS_META[App.profile.subject];
    this.pool = meta.data().Q;
    this.idx = LS_get('eh_home_idx_'+App.profile.subject, 0);
    if(this.idx >= this.pool.length) this.idx = 0;
    this.render();
  },"""
new_js = """const Home = {
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
  },"""
assert html.count(old_js) == 1, "Home.init 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_js, new_js); changed += 1

old_nav = """  next(){ this.idx = (this.idx+1) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); },
  prev(){ this.idx = (this.idx-1+this.pool.length) % this.pool.length; LS_set('eh_home_idx_'+App.profile.subject, this.idx); this.render(); }
};"""
new_nav = """  next(){ this.idx = (this.idx+1) % this.pool.length; this._save(); this.render(); },
  prev(){ this.idx = (this.idx-1+this.pool.length) % this.pool.length; this._save(); this.render(); },
  _save(){
    LS_set('eh_home_idx_'+App.profile.subject, this.idx);
    if(window.socket) socket.emit('cardProgress:save', { subject: App.profile.subject, index: this.idx });
  }
};"""
assert html.count(old_nav) == 1, "Home.next/prev 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_nav, new_nav); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/2 블록 수정됨")