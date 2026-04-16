const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'db.json';

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ quizzes: [], sessions: [], users: [] }));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// AUTH
app.post('/api/register', (req, res) => {
  const db = readDB();
  const user = { id: Date.now(), ...req.body };
  db.users.push(user);
  writeDB(db);
  res.json(user);
});

app.post('/api/login', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.email === req.body.email && u.password === req.body.password);
  if (!user) return res.status(401).json({ error: 'Invalid' });
  res.json(user);
});

// CREATE QUIZ
app.post('/api/quizzes', (req, res) => {
  const db = readDB();
  const quiz = { id: Date.now(), ...req.body };
  db.quizzes.push(quiz);
  writeDB(db);
  res.json(quiz);
});

// GET QUIZ
app.get('/api/quizzes/:id', (req, res) => {
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id == req.params.id);
  res.json(quiz);
});

// START SESSION
app.post('/api/start', (req, res) => {
  const db = readDB();
  const session = {
    id: Date.now(),
    quizId: req.body.quizId,
    user: req.body.user,
    answers: [],
    score: 0
  };
  db.sessions.push(session);
  writeDB(db);
  res.json(session);
});

// SUBMIT
app.post('/api/submit', (req, res) => {
  const db = readDB();
  const { sessionId, answers } = req.body;

  const session = db.sessions.find(s => s.id == sessionId);
  const quiz = db.quizzes.find(q => q.id == session.quizId);

  let score = 0;

  quiz.questions.forEach((q, i) => {
    if (q.type === 'single' && q.correct === answers[i]) score++;
    if (q.type === 'multi') {
      const correct = q.correct.sort().join(',');
      const ans = (answers[i] || []).sort().join(',');
      if (correct === ans) score++;
    }
    if (q.type === 'number' && Number(q.correct) === Number(answers[i])) score++;
  });

  session.answers = answers;
  session.score = score;

  writeDB(db);

  res.json({ score });
});

// RESULTS
app.get('/api/results', (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

app.listen(3001, () => console.log('Server running'));