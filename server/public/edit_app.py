with open("app.html", "r", encoding="utf-8") as f:
    src = f.read()
orig = src

# 1) CSS 추가
old1 = """.btn.block{width:100%;}

"""
new1 = """.btn.block{width:100%;}

/* ===== 로그인/회원가입 ===== */
#authScreen{position:fixed;inset:0;background:var(--bg);z-index:300;overflow-y:auto;display:none;padding:60px 16px;}
#authScreen.show{display:block;}
.auth-wrap{max-width:400px;margin:0 auto;}
.auth-title{font-size:22px;font-weight:800;margin-bottom:6px;text-align:center;}
.auth-sub{color:var(--muted);font-size:13px;margin-bottom:28px;text-align:center;}
.auth-input{width:100%;background:var(--surface);border:1px solid var(--line);color:var(--text);
  border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:8px;}
.auth-error{color:var(--red);font-size:12px;margin:-4px 0 10px 2px;min-height:14px;}
.auth-switch{text-align:center;margin-top:16px;font-size:13px;color:var(--muted);}
.auth-switch a{color:var(--cyan);cursor:pointer;text-decoration:underline;}

"""
assert src.count(old1) == 1, f"1) CSS 삽입 지점 매치 개수: {src.count(old1)}"
src = src.replace(old1, new1)

# 2) socket.io 클라이언트 스크립트 태그 추가
old2 = """<script src="storage-shim.js"></script>
<script src="emt2-data.js"></script>"""
new2 = """<script src="/socket.io/socket.io.js"></script>
<script src="storage-shim.js"></script>
<script src="emt2-data.js"></script>"""
assert src.count(old2) == 1, f"2) socket.io 스크립트 태그 매치 개수: {src.count(old2)}"
src = src.replace(old2, new2)

# 3) 로그인/회원가입 화면 마크업 추가 (body 시작 직후, 온보딩 화면 바로 위)
old3 = """<body>

<!-- ================= 온보딩 ================= -->
<div id="onboard">"""
new3 = """<body>

<!-- ================= 로그인/회원가입 ================= -->
<div id="authScreen">
  <div class="auth-wrap">
    <div class="auth-title">학습 카드 허브</div>
    <div class="auth-sub" id="authSubMsg">로그인해주세요</div>

    <div id="authLoginForm">
      <input type="tel" id="authLoginPhone" class="auth-input" placeholder="전화번호">
      <input type="password" id="authLoginPw" class="auth-input" placeholder="비밀번호">
      <div class="auth-error" id="authLoginError"></div>
      <button class="btn primary block" onclick="Auth.login()">로그인</button>
      <div class="auth-switch">계정이 없으신가요? <a onclick="Auth.showSignup()">회원가입</a></div>
    </div>

    <div id="authSignupForm" style="display:none;">
      <input type="tel" id="authSignupPhone" class="auth-input" placeholder="전화번호" oninput="Auth.onPhoneInput()">
      <div class="auth-error" id="authSignupPhoneError"></div>
      <input type="password" id="authSignupPw" class="auth-input" placeholder="비밀번호" oninput="Auth.validateSignup()">
      <input type="password" id="authSignupPw2" class="auth-input" placeholder="비밀번호 확인" oninput="Auth.validateSignup()">
      <div class="auth-error" id="authSignupPwError"></div>
      <button class="btn primary block" id="authSignupBtn" disabled onclick="Auth.signup()">가입하기</button>
      <div class="auth-switch">이미 계정이 있으신가요? <a onclick="Auth.showLogin()">로그인</a></div>
    </div>
  </div>
</div>

<!-- ================= 온보딩 ================= -->
<div id="onboard">"""
assert src.count(old3) == 1, f"3) 로그인화면 마크업 매치 개수: {src.count(old3)}"
src = src.replace(old3, new3)

# 4) Auth JS 객체 추가 + 마지막 OB.init() 을 Auth.init() 으로 교체
old4 = """OB.init();
</script>
</body>
</html>"""
new4 = """const Auth = {
  phoneCheckTimer:null,
  init(){
    const token = LS_get('eh_token', null);
    if(!token){ this.showLogin(); return; }
    this.connectAfterAuth();
  },
  showLogin(){
    document.getElementById('authScreen').classList.add('show');
    document.getElementById('authLoginForm').style.display='block';
    document.getElementById('authSignupForm').style.display='none';
    document.getElementById('authSubMsg').textContent = '로그인해주세요';
  },
  showSignup(){
    document.getElementById('authScreen').classList.add('show');
    document.getElementById('authLoginForm').style.display='none';
    document.getElementById('authSignupForm').style.display='block';
    document.getElementById('authSubMsg').textContent = '회원가입';
  },
  onPhoneInput(){
    clearTimeout(this.phoneCheckTimer);
    document.getElementById('authSignupPhoneError').textContent = '';
    this.phoneCheckTimer = setTimeout(()=>this.checkPhoneDup(), 500);
  },
  async checkPhoneDup(){
    const phone = document.getElementById('authSignupPhone').value.trim();
    const errEl = document.getElementById('authSignupPhoneError');
    if(!phone) return;
    try{
      const res = await fetch('/api/auth/check-phone', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone})});
      const data = await res.json();
      if(data.success && data.exists) errEl.textContent = '중복된 번호입니다';
    }catch(e){}
    this.validateSignup();
  },
  validateSignup(){
    const pw = document.getElementById('authSignupPw').value;
    const pw2 = document.getElementById('authSignupPw2').value;
    const pwErrEl = document.getElementById('authSignupPwError');
    const phoneErr = document.getElementById('authSignupPhoneError').textContent;
    let pwOk = true;
    if(pw2 && pw !== pw2){ pwErrEl.textContent = '비밀번호가 일치하지 않습니다'; pwOk = false; }
    else { pwErrEl.textContent = ''; }
    document.getElementById('authSignupBtn').disabled = !(pw && pw2 && pwOk && !phoneErr);
  },
  async signup(){
    const phone = document.getElementById('authSignupPhone').value.trim();
    const password = document.getElementById('authSignupPw').value;
    try{
      const res = await fetch('/api/auth/signup', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, password})});
      const data = await res.json();
      if(!data.success){ document.getElementById('authSignupPhoneError').textContent = data.message || '가입 실패'; return; }
      LS_set('eh_token', data.token);
      this.connectAfterAuth();
    }catch(e){ document.getElementById('authSignupPhoneError').textContent = '서버 오류가 발생했습니다'; }
  },
  async login(){
    const phone = document.getElementById('authLoginPhone').value.trim();
    const password = document.getElementById('authLoginPw').value;
    const errEl = document.getElementById('authLoginError');
    errEl.textContent = '';
    try{
      const res = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, password})});
      const data = await res.json();
      if(!data.success){ errEl.textContent = data.message || '로그인에 실패했습니다'; return; }
      LS_set('eh_token', data.token);
      this.connectAfterAuth();
    }catch(e){ errEl.textContent = '서버 오류가 발생했습니다'; }
  },
  connectAfterAuth(){
    const token = LS_get('eh_token', null);
    window.socket = io({ auth: { token } });
    socket.on('connect', ()=>{
      document.getElementById('authScreen').classList.remove('show');
      OB.init();
    });
    socket.on('connect_error', ()=>{
      LS_set('eh_token', null);
      document.getElementById('authLoginError').textContent = '';
      this.showLogin();
    });
  }
};

Auth.init();
</script>
</body>
</html>"""
assert src.count(old4) == 1, f"4) Auth 객체+init 교체 매치 개수: {src.count(old4)}"
src = src.replace(old4, new4)

assert src != orig, "변경사항 없음"
with open("app.html", "w", encoding="utf-8") as f:
    f.write(src)
print("app.html 패치 완료 (4건 모두 매치 확인됨)")