# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app10.py)
# 목적: 모의고사 결과화면에서 "오답만 다시 풀기" 기능 추가

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

# 1) HTML: 결과화면 상단에 다시풀기 버튼 추가
old_html = """    <div class="res-score">
      <div class="num" id="resScoreNum">0/0</div>
      <div class="lbl" id="resScoreLbl">모의고사 결과</div>
    </div>
    <div class="res-section">
      <h3>📉 약점 분석</h3>"""
new_html = """    <div class="res-score">
      <div class="num" id="resScoreNum">0/0</div>
      <div class="lbl" id="resScoreLbl">모의고사 결과</div>
    </div>
    <button class="btn primary block" id="resRetryBtn" onclick="ResultView.retryWrong()" style="margin-bottom:14px;">🔁 오답만 다시 풀기</button>
    <div class="res-section">
      <h3>📉 약점 분석</h3>"""
assert html.count(old_html) == 1, "결과화면 HTML 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_html, new_html); changed += 1

# 2) doSubmit(): 오답재도전 회차인지 여부를 기록에도 남김
old_submit = """    const entry = {
      round: p.round,
      submittedAt: Date.now(),
      total: p.pool.length,
      correct: correct,
      answers: p.answers,
      poolSnapshot: p.pool,
      subjectBreakdown: subjectBreakdown
    };"""
new_submit = """    const entry = {
      round: p.round,
      submittedAt: Date.now(),
      total: p.pool.length,
      correct: correct,
      answers: p.answers,
      poolSnapshot: p.pool,
      subjectBreakdown: subjectBreakdown,
      isRetry: !!p.isRetry,
      retryOf: p.retryOf || null
    };"""
assert html.count(old_submit) == 1, "doSubmit entry 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_submit, new_submit); changed += 1

# 3) 기록 목록(Exam.renderList)에 오답재도전 표시
old_list = """          <div><div class="eh-round">${h.round}회차 · ${new Date(h.submittedAt).toLocaleDateString('ko-KR')}</div>"""
new_list = """          <div><div class="eh-round">${h.isRetry ? '오답재도전('+h.retryOf+'회차) · ' : ''}${h.round}회차 · ${new Date(h.submittedAt).toLocaleDateString('ko-KR')}</div>"""
assert html.count(old_list) == 1, "renderList 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_list, new_list); changed += 1

# 4) 결과 상세 화면(ResultView.open) 라벨에도 오답재도전 표시
old_lbl = """    document.getElementById('resScoreLbl').textContent = `${h.round}회차 · ${new Date(h.submittedAt).toLocaleDateString('ko-KR')}`;"""
new_lbl = """    document.getElementById('resScoreLbl').textContent = `${h.isRetry ? '오답재도전('+h.retryOf+'회차) · ' : ''}${h.round}회차 · ${new Date(h.submittedAt).toLocaleDateString('ko-KR')}`;"""
assert html.count(old_lbl) == 1, "resScoreLbl 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_lbl, new_lbl); changed += 1

# 5) ResultView에 retryWrong() 메서드 추가
old_method = """  toggleSubj(sname){
    document.getElementById('rsPanel-'+sname).classList.toggle('open');
    document.getElementById('rsChev-'+sname).classList.toggle('open');
  },
  close(){
    document.getElementById('examResult').classList.remove('show');
    Nav.go('exam');
  }
};"""
new_method = """  toggleSubj(sname){
    document.getElementById('rsPanel-'+sname).classList.toggle('open');
    document.getElementById('rsChev-'+sname).classList.toggle('open');
  },
  retryWrong(){
    const subj = App.profile.subject;
    const hist = LS_get('eh_exam_history_'+subj, []);
    const h = hist[this.entryIdx];
    const wrongQs = [];
    Object.values(h.subjectBreakdown).forEach(sb=>{ sb.wrongPoolIdx.forEach(pi=>wrongQs.push(h.poolSnapshot[pi])); });
    if(wrongQs.length===0){ alert('이 회차는 오답이 없어요, 다시 풀 문제가 없습니다!'); return; }
    const meta = SUBJECTS_META[subj];
    const prog = {
      round: hist.length+1,
      pool: wrongQs,
      answers: {},
      current: 0,
      startedAt: Date.now(),
      timeLimitSec: meta.timeLimitMin*60,
      timeLeftSec: meta.timeLimitMin*60,
      isRetry: true,
      retryOf: h.round
    };
    LS_set('eh_exam_progress_'+subj, prog);
    if(window.socket) socket.emit('examProgress:save', { subject: subj, state: prog });
    this.close();
    ExamTake.start(prog);
  },
  close(){
    document.getElementById('examResult').classList.remove('show');
    Nav.go('exam');
  }
};"""
assert html.count(old_method) == 1, "ResultView 메서드 앵커를 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old_method, new_method); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/5 블록 수정됨")