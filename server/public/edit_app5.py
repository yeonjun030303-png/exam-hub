# -*- coding: utf-8 -*-
# 실행 위치: server/public/  (여기서 python3 edit_app5.py)
# 목적: 모의고사 응시화면 "제출하기" 버튼이 하단 고정 네비바(#bottomnav)에 가려 안 보이는 문제 수정
#      -> body 하단 여백을 넉넉히 늘리고(세이프에어리어 포함), 제출버튼 아래 여백도 추가해서
#         스크롤을 끝까지 내리면 확실히 보이게 함

path = "app.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changed = 0

# 1) body 하단 패딩: 고정폭 78px -> 네비바 실제 높이 변화(세이프에어리어 포함)에 안전하게 대응
old1 = """  margin:0;background:radial-gradient(ellipse at top,#0F1B33 0%,var(--bg) 55%);
  color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Malgun Gothic",sans-serif;
  min-height:100vh;padding-bottom:78px;
}"""
new1 = """  margin:0;background:radial-gradient(ellipse at top,#0F1B33 0%,var(--bg) 55%);
  color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Malgun Gothic",sans-serif;
  min-height:100vh;padding-bottom:calc(100px + env(safe-area-inset-bottom));
}"""
assert html.count(old1) == 1, "body 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old1, new1); changed += 1

# 2) 제출하기 버튼 아래쪽에 여유 여백 추가 (네비바와 확실히 떨어지게)
old2 = """.et-submitbtn{width:100%;margin-top:6px;}"""
new2 = """.et-submitbtn{width:100%;margin-top:6px;margin-bottom:20px;}"""
assert html.count(old2) == 1, "et-submitbtn 블록을 못 찾음(파일이 바뀌었을 수 있음)"
html = html.replace(old2, new2); changed += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"완료: {changed}/2 블록 수정됨")