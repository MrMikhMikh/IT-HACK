const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.json());

let quizzes = [];
let sessions = [];

app.post('/api/quizzes', (req, res) => {
  const quiz = { id: Date.now(), ...req.body };
  quizzes.push(quiz);
  res.json(quiz);
});

app.get('/api/quizzes/:id', (req, res) => {
  const quiz = quizzes.find(q => q.id == req.params.id);
  res.json(quiz);
});

app.post('/api/start', (req, res) => {
  const session = { id: Date.now(), ...req.body, answers: [], score: 0 };
  sessions.push(session);
  res.json(session);
});

app.post('/api/submit', (req, res) => {
  const { sessionId, answers } = req.body;
  const session = sessions.find(s => s.id == sessionId);
  const quiz = quizzes.find(q => q.id == session.quizId);

  let score = 0;

  quiz.questions.forEach((q, i) => {
    if (q.correct === answers[i]) score++;
  });

  session.score = score;
  session.answers = answers;

  res.json({ score });
});

app.listen(3001, () => console.log('Server running on 3001'));


// File: backend/package.json

{
  "name": "quiz-backend",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}