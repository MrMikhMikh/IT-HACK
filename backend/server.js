const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const DB_FILE = 'db.json';
const UPLOADS_DIR = 'uploads';

// Создаём папки, если их нет
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    users: [],
    quizzes: [],
    sessions: []
  }, null, 2));
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Чтение/запись БД
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Multer настройка для загрузки медиа
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml',
    'audio/mpeg', 'audio/ogg',
    'video/mp4', 'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый формат файла. Разрешены: JPG, PNG, GIF, SVG, MP3, OGG, MP4, WebM'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // максимум 50 МБ
});

// Статическая раздача загруженных файлов
app.use('/uploads', express.static(UPLOADS_DIR));

// ====================== AUTH ======================
app.post('/api/register', (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }

  const user = {
    id: Date.now(),
    email,
    password, // В реальном проекте обязательно хэшируй пароль!
    role: 'author',
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDB(db);
  res.json({ id: user.id, email: user.email, role: user.role });
});

app.post('/api/login', (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role
  });
});

// ====================== QUIZZES ======================
app.post('/api/quizzes', (req, res) => {
  const db = readDB();
  const quiz = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    authorId: req.body.authorId
  };

  db.quizzes.push(quiz);
  writeDB(db);
  res.json(quiz);
});

app.get('/api/quizzes', (req, res) => {
  const db = readDB();
  res.json(db.quizzes);
});

app.get('/api/quizzes/:id', (req, res) => {
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id == req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Тест не найден' });
  res.json(quiz);
});

// ====================== MEDIA UPLOAD ======================
app.post('/api/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не был загружен' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype
  });
});

// ====================== SESSIONS (прохождение теста) ======================
app.post('/api/start', (req, res) => {
  const db = readDB();
  const { quizId, participant } = req.body; // participant = {fio, school, class, birthYear, participatedBefore}

  const session = {
    id: Date.now(),
    quizId: Number(quizId),
    participant,
    answers: [],
    autoScore: 0,
    manualScore: 0,
    totalScore: 0,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  db.sessions.push(session);
  writeDB(db);
  res.json(session);
});

app.post('/api/submit', (req, res) => {
  const db = readDB();
  const { sessionId, answers } = req.body;

  const session = db.sessions.find(s => s.id == sessionId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  const quiz = db.quizzes.find(q => q.id == session.quizId);
  if (!quiz) return res.status(404).json({ error: 'Тест не найден' });

  let autoScore = 0;

  quiz.questions.forEach((q, index) => {
    const answer = answers[index];

    if (!q.type || q.type === 'single' || q.type === 'number') {
      if (String(q.correct).trim() === String(answer).trim()) autoScore += (q.points || 1);
    }
    else if (q.type === 'multi') {
      const correctSorted = Array.isArray(q.correct) ? q.correct.sort().join(',') : '';
      const answerSorted = Array.isArray(answer) ? answer.sort().join(',') : '';
      if (correctSorted === answerSorted) autoScore += (q.points || 1);
    }
    // open и media с открытым ответом — оставляем 0 (будет проверять автор)
  });

  session.answers = answers;
  session.autoScore = autoScore;
  session.totalScore = autoScore; // пока без ручной проверки
  session.status = 'completed';
  session.completedAt = new Date().toISOString();

  writeDB(db);
  res.json({
    sessionId: session.id,
    autoScore,
    totalScore: session.totalScore
  });
});

// ====================== RESULTS & CHECKING ======================
app.get('/api/results', (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

app.get('/api/results/:sessionId', (req, res) => {
  const db = readDB();
  const session = db.sessions.find(s => s.id == req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Результат не найден' });
  res.json(session);
});

// Обновление баллов за открытые вопросы (автор проверяет)
app.patch('/api/results/:sessionId/score', (req, res) => {
  const db = readDB();
  const { sessionId } = req.params;
  const { manualScores } = req.body; // массив баллов для открытых вопросов

  const session = db.sessions.find(s => s.id == sessionId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

  session.manualScore = manualScores.reduce((sum, score) => sum + (Number(score) || 0), 0);
  session.totalScore = session.autoScore + session.manualScore;

  writeDB(db);
  res.json({ success: true, totalScore: session.totalScore });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`📁 Медиа-файлы доступны по: http://localhost:${PORT}/uploads/...`);
});