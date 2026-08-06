require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =====================================================================
   Firebase 초기화
   - 말벗과 동일하게 .env의 FIREBASE_SERVICE_ACCOUNT(서비스계정 JSON 문자열)와
     FIREBASE_DB_URL(Realtime Database URL)을 사용함.
   - 별도의 새 Firebase 프로젝트를 만들어도 되고, 말벗과 같은 프로젝트 안에
     다른 경로(예: /examhub/...)를 써서 같이 써도 됨 (이번 코드는 독립 프로젝트
     기준으로 루트 경로를 그대로 사용하도록 작성함 - 같이 쓸 경우 db.ref() 앞에
     'examhub/'를 붙이는 식으로 조정하면 됨).
===================================================================== */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
if (!process.env.ALLOWED_ORIGIN) {
  console.warn('[경고] ALLOWED_ORIGIN이 .env에 설정되어 있지 않아 모든 출처(*)를 허용합니다. 배포 시 실제 도메인으로 제한하는 것을 권장합니다.');
}
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 상시 구동 확인용 헬스체크 - UptimeRobot 등 외부 무료 핑 서비스로 이 주소를
// 5분 간격 정도로 호출하도록 등록하면 Render 무료 플랜의 슬립 모드를 방지할 수 있음.
// (말벗 서버와 동일한 방식)
app.get('/health', (req, res) => res.status(200).send('ok'));

/* =====================================================================
   세션 (전화번호 + 비밀번호)
===================================================================== */
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_only_insecure_secret_please_set_env';
if (!process.env.SESSION_SECRET) {
  console.warn('[경고] SESSION_SECRET이 .env에 설정되어 있지 않습니다. 반드시 설정해주세요 (안 하면 서버 재시작마다 전체 로그아웃됨).');
}
const SESSION_MAX_AGE = '30d'; // 필요에 맞게 조정 가능

function issueToken(uid) {
  return jwt.sign({ uid }, SESSION_SECRET, { expiresIn: SESSION_MAX_AGE });
}
function verifyToken(token) {
  try { return jwt.verify(token, SESSION_SECRET); } catch (e) { return null; }
}

// 전화번호를 숫자만 남긴 형태로 정규화 (하이픈 유무 관계없이 동일 계정으로 인식)
function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

async function findUserByPhone(phone) {
  const norm = normalizePhone(phone);
  const snap = await db.ref('users').orderByChild('phone').equalTo(norm).once('value');
  const val = snap.val();
  if (!val) return null;
  const uid = Object.keys(val)[0];
  return { uid, ...val[uid] };
}
async function getUser(uid) {
  const snap = await db.ref(`users/${uid}`).once('value');
  return snap.val();
}
async function saveUser(uid, data) {
  await db.ref(`users/${uid}`).update(data);
}

/* =====================================================================
   REST: 회원가입 / 로그인
===================================================================== */

// 아이디(전화번호) 중복 체크 - 회원가입 화면에서 입력하는 동안 실시간으로 호출
app.post('/api/auth/check-phone', async (req, res) => {
  try {
    const existing = await findUserByPhone(req.body.phone);
    res.json({ success: true, exists: !!existing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const norm = normalizePhone(phone);
    if (!norm || norm.length < 10) {
      return res.status(400).json({ success: false, message: '전화번호를 올바르게 입력해주세요.' });
    }
    if (!password || String(password).length < 4) {
      return res.status(400).json({ success: false, message: '비밀번호를 입력해주세요.' });
    }
    const existing = await findUserByPhone(norm);
    if (existing) {
      return res.status(409).json({ success: false, message: '중복된 번호입니다' });
    }
    const uid = db.ref('users').push().key;
    const passwordHash = await bcrypt.hash(password, 10);
    const today = todayStr();
    const newUser = {
      id: uid,
      phone: norm,
      passwordHash,
      createdAt: Date.now(),
      lastActiveDate: today,
      streakCount: 1,
      profiles: {},        // subject별: { goalType, goalNum, examDate }
      cardProgress: {},    // subject별: 마지막으로 본 카드 인덱스
      bookmarks: {}        // subject별: [questionId, ...]
    };
    await db.ref(`users/${uid}`).set(newUser);
    const token = issueToken(uid);
    res.json({ success: true, token, hasProfile: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const user = await findUserByPhone(phone);
    if (!user) return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    const ok = await bcrypt.compare(password || '', user.passwordHash || '');
    if (!ok) return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    const { streakCount, lastActiveDate } = updateStreak(user.lastActiveDate, user.streakCount);
    await saveUser(user.uid, { lastActiveDate, streakCount });

    const token = issueToken(user.uid);
    const hasProfile = !!(user.profiles && Object.keys(user.profiles).length > 0);
    res.json({ success: true, token, hasProfile });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 오늘 날짜(YYYY-MM-DD, 로컬 자정 기준) 문자열
function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// 연속 학습일 계산: 어제 접속했으면 +1, 오늘 이미 접속했으면 유지, 그 외(하루 이상 끊김)는 1로 리셋
function updateStreak(lastActiveDate, streakCount) {
  const today = todayStr();
  if (lastActiveDate === today) return { streakCount: streakCount || 1, lastActiveDate: today };
  const yesterday = todayStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (lastActiveDate === yesterday) return { streakCount: (streakCount || 0) + 1, lastActiveDate: today };
  return { streakCount: 1, lastActiveDate: today };
}

/* =====================================================================
   Socket.io 인증 미들웨어
   - 클라이언트는 연결 시 auth:{ token } 형태로 로그인에서 받은 JWT를 넘겨야 함
   - 인증 실패 시 연결 자체를 거부함
===================================================================== */
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const payload = token && verifyToken(token);
  if (!payload) return next(new Error('unauthorized'));
  socket.uid = payload.uid;
  next();
});

io.on('connection', (socket) => {
  const uid = socket.uid;

  /* ---------------- 프로필 (과목/목표/D-day) ---------------- */
  socket.on('profile:get', async (data, cb) => {
    try {
      const user = await getUser(uid);
      cb && cb({ success: true, profiles: (user && user.profiles) || {}, streakCount: user && user.streakCount, lastActiveDate: user && user.lastActiveDate });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  // data: { subject, goalType, goalNum, examDate }  (examDate는 'YYYY-MM-DD' 또는 null - 선택사항)
  socket.on('profile:save', async (data, cb) => {
    try {
      const { subject, goalType, goalNum, examDate } = data || {};
      if (!subject) return cb && cb({ success: false, message: 'subject 필요' });
      await db.ref(`users/${uid}/profiles/${subject}`).set({
        goalType: goalType || null,
        goalNum: goalNum || null,
        examDate: examDate || null,
        updatedAt: Date.now()
      });
      cb && cb({ success: true });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 카드 학습 진행 ---------------- */
  socket.on('cardProgress:save', async (data, cb) => {
    try {
      const { subject, index } = data || {};
      if (!subject) return cb && cb({ success: false });
      await db.ref(`users/${uid}/cardProgress/${subject}`).set(index);
      cb && cb({ success: true });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
  socket.on('cardProgress:get', async (data, cb) => {
    try {
      const snap = await db.ref(`users/${uid}/cardProgress/${(data && data.subject) || ''}`).once('value');
      cb && cb({ success: true, index: snap.val() || 0 });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 모의고사 진행 중 상태(자동저장) ---------------- */
  // state: { round, pool:[questionId...], answers:{questionId:answerIndex}, currentIndex, remainingSeconds }
  socket.on('examProgress:save', async (data, cb) => {
    try {
      const { subject, state } = data || {};
      if (!subject) return cb && cb({ success: false });
      await db.ref(`users/${uid}/examProgress/${subject}`).set({ ...state, savedAt: Date.now() });
      cb && cb({ success: true });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
  socket.on('examProgress:get', async (data, cb) => {
    try {
      const snap = await db.ref(`users/${uid}/examProgress/${(data && data.subject) || ''}`).once('value');
      cb && cb({ success: true, state: snap.val() || null });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
  socket.on('examProgress:clear', async (data, cb) => {
    try {
      const { subject } = data || {};
      await db.ref(`users/${uid}/examProgress/${subject}`).remove();
      cb && cb({ success: true });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 모의고사 기록(제출 완료분) ---------------- */
  // record: { round, submittedAt, totalScore, correctCount, bySubject:{...}, answers:{questionId:{picked,correct}}, questionIdsSnapshot:[...] }
  socket.on('examHistory:save', async (data, cb) => {
    try {
      const { subject, record } = data || {};
      if (!subject || !record) return cb && cb({ success: false });
      const ref = db.ref(`examHistory/${uid}/${subject}`).push();
      const saved = { id: ref.key, ...record, submittedAt: Date.now() };
      await ref.set(saved);

      // 문제별 통계 갱신 (전역 집계 - 킬포인트 트렌드 코멘트용)
      if (record.answers) {
        const updates = {};
        Object.entries(record.answers).forEach(([qid, ans]) => {
          updates[`questionStats/${subject}/${qid}/attempts`] = admin.database.ServerValue.increment(1);
          if (ans && ans.correct) {
            updates[`questionStats/${subject}/${qid}/correct`] = admin.database.ServerValue.increment(1);
          }
        });
        if (Object.keys(updates).length) await db.ref().update(updates);
      }

      cb && cb({ success: true, id: ref.key });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
  socket.on('examHistory:list', async (data, cb) => {
    try {
      const { subject } = data || {};
      const snap = await db.ref(`examHistory/${uid}/${subject}`).once('value');
      const val = snap.val() || {};
      const list = Object.values(val).sort((a, b) => a.submittedAt - b.submittedAt);
      cb && cb({ success: true, records: list });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 즐겨찾기(북마크) ---------------- */
  socket.on('bookmark:toggle', async (data, cb) => {
    try {
      const { subject, questionId } = data || {};
      if (!subject || !questionId) return cb && cb({ success: false });
      const ref = db.ref(`users/${uid}/bookmarks/${subject}/${questionId}`);
      const snap = await ref.once('value');
      if (snap.exists()) { await ref.remove(); cb && cb({ success: true, bookmarked: false }); }
      else { await ref.set(true); cb && cb({ success: true, bookmarked: true }); }
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
  socket.on('bookmark:list', async (data, cb) => {
    try {
      const { subject } = data || {};
      const snap = await db.ref(`users/${uid}/bookmarks/${subject}`).once('value');
      cb && cb({ success: true, questionIds: Object.keys(snap.val() || {}) });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 문제 오류 신고 ---------------- */
  socket.on('questionReport:submit', async (data, cb) => {
    try {
      const { subject, questionId, reason, detail } = data || {};
      if (!subject || !questionId || !reason) return cb && cb({ success: false });
      const ref = db.ref('questionReports').push();
      await ref.set({
        id: ref.key, subject, questionId, reason, detail: detail || '',
        reporterUid: uid, createdAt: Date.now(), status: 'pending'
      });
      cb && cb({ success: true });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });

  /* ---------------- 문제별 통계 조회 (킬포인트 트렌드 코멘트용) ---------------- */
  // 최소 응시자 수(MIN_ATTEMPTS) 미만인 문제는 아직 신뢰도가 낮아 통계를 표시하지 않음
  const MIN_ATTEMPTS = 10;
  socket.on('questionStats:get', async (data, cb) => {
    try {
      const { subject, questionIds } = data || {};
      if (!subject || !Array.isArray(questionIds)) return cb && cb({ success: false });
      const results = {};
      await Promise.all(questionIds.map(async (qid) => {
        const snap = await db.ref(`questionStats/${subject}/${qid}`).once('value');
        const v = snap.val();
        if (!v || !v.attempts || v.attempts < MIN_ATTEMPTS) { results[qid] = null; return; }
        results[qid] = { attempts: v.attempts, correctRate: (v.correct || 0) / v.attempts };
      }));
      cb && cb({ success: true, stats: results });
    } catch (e) { console.error(e); cb && cb({ success: false }); }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`exam-hub 서버 실행 중 (Firebase 연동): http://localhost:${PORT}`));
