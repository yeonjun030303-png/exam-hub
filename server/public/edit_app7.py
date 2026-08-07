# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app7.py)
# 목적: 모의고사 진행중 상태(examProgress) + 제출 기록(examHistory)을 서버와 동기화
#      -> 다른 기기에서도 풀던 모의고사를 이어서 볼 수 있고, 기록도 서버에 남음

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

# 1) startNewClicked: 로컬에 진행중 기록 없으면 서버(examProgress:get)에도 확인
old1 = """  /* ----- 새 모의고사 시작 ----- */
  startNewClicked(){
    const subj = App.profile.subject;
    const prog = LS_get('eh_exam_progress_'+subj, null);
    if(prog){
      const answeredCount = Object.keys(prog.answers).length;
      document.getElementById('resumeMsg').textContent =
        `기존에 풀던 ${prog.round}회차 (${answeredCount}/${prog.pool.length}문제 진행중)이 있습니다. 이어서 진행할까요?`;
      document.getElementById('resumeModal').classList.add('open');
    }else{
      this.beginNewExam();
    }
  },"""
new1 = """  /* ----- 새 모의고사 시작 ----- */
  startNewClicked(){
    const subj = App.profile.subject;
    const prog = LS_get('eh_exam_progress_'+subj, null);
    if(prog){
      this._showResumePrompt(prog);
    }else if(window.socket){
      // 이 기기엔 진행중 기록이 없으면, 다른 기기에서 풀던 게 서버에 남아있는지 확인
      socket.emit('examProgress:get', { subject: subj }, (res)=>{
        if(res && res.success && res.state){
          LS_set('eh_exam_progress_'+subj, res.state);
          this._showResumePrompt(res.state);
        }else{
          this.beginNewExam();
        }
      });
    }else{
      this.beginNewExam();
    }
  },
  _showResumePrompt(prog){
    const answeredCount = Object.keys(prog.answers).length;
    document.getElementById('resumeMsg').textContent =
      `기존에 풀던 ${prog.round}회차 (${answeredCount}/${prog.pool.length}문제 진행중)이 있습니다. 이어서 진행할까요?`;
    document.getElementById('resumeModal').classList.add('open');
  },"""
assert html.count(old1) == 1, "startNewClicked 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old1, new1); changed += 1

# 2) beginNewExam: 새 시험 시작 시 서버에도 진행상태 저장
old2 = """    LS_set('eh_exam_progress_'+subj, prog);
    ExamTake.start(prog);
  }
};"""
new2 = """    LS_set('eh_exam_progress_'+subj, prog);
    if(window.socket) socket.emit('examProgress:save', { subject: subj, state: prog });
    ExamTake.start(prog);
  }
};"""
assert html.count(old2) == 1, "beginNewExam 저장 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old2, new2); changed += 1

# 3) ExamTake.save(): 자동저장 시점마다(답 선택, 5초마다 등) 서버에도 저장
old3 = """  save(){ LS_set('eh_exam_progress_'+App.profile.subject, this.prog); },"""
new3 = """  save(){
    const subj = App.profile.subject;
    LS_set('eh_exam_progress_'+subj, this.prog);
    if(window.socket) socket.emit('examProgress:save', { subject: subj, state: this.prog });
  },"""
assert html.count(old3) == 1, "ExamTake.save 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old3, new3); changed += 1

# 4) doSubmit(): 제출 시 서버에 기록 저장(examHistory:save) + 진행상태 삭제(examProgress:clear)
old4 = """    const hist = LS_get('eh_exam_history_'+subj, []);
    hist.push(entry);
    LS_set('eh_exam_history_'+subj, hist);
    localStorage.removeItem('eh_exam_progress_'+subj);
    ResultView.open(hist.length-1);
  }
};"""
new4 = """    const hist = LS_get('eh_exam_history_'+subj, []);
    hist.push(entry);
    LS_set('eh_exam_history_'+subj, hist);
    localStorage.removeItem('eh_exam_progress_'+subj);
    if(window.socket){
      socket.emit('examHistory:save', { subject: subj, record: entry });
      socket.emit('examProgress:clear', { subject: subj });
    }
    ResultView.open(hist.length-1);
  }
};"""
assert html.count(old4) == 1, "doSubmit 저장 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old4, new4); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/4 블록 수정됨")