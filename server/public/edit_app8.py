# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app8.py)
# 목적: 모의고사 제출 확인 모달 문구를 v6 기획 스펙 형식으로 교체
#      - 다 풀었을 때: "모든 문제를 다 푸셨습니다. 제출하시겠습니까?"
#      - 안 푼 문제가 있을 때: "N문제(12번, 19번...)를 안 푸셨습니다. 그래도 제출하시겠습니까?"

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

old = """  trySubmit(){
    const p = this.prog;
    const unanswered = [];
    p.pool.forEach((q,i)=>{ if(p.answers[i]===undefined) unanswered.push(i+1); });
    if(unanswered.length>0){
      document.getElementById('submitMsg').textContent =
        `${unanswered.join(', ')}번 문제를 아직 풀지 않았습니다. 그래도 제출하시겠습니까?`;
    }else{
      document.getElementById('submitMsg').textContent = `제출하시겠습니까?`;
    }
    document.getElementById('submitModal').classList.add('open');
  },"""
new = """  trySubmit(){
    const p = this.prog;
    const unanswered = [];
    p.pool.forEach((q,i)=>{ if(p.answers[i]===undefined) unanswered.push(i+1); });
    if(unanswered.length>0){
      const nums = unanswered.map(n=>n+'번').join(', ');
      document.getElementById('submitMsg').textContent =
        `${unanswered.length}문제(${nums})를 안 푸셨습니다. 그래도 제출하시겠습니까?`;
    }else{
      document.getElementById('submitMsg').textContent = `모든 문제를 다 푸셨습니다. 제출하시겠습니까?`;
    }
    document.getElementById('submitModal').classList.add('open');
  },"""
assert html.count(old) == 1, "trySubmit 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old, new); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/1 블록 수정됨")