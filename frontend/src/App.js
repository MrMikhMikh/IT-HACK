import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://pct-nominated-extras-slideshow.trycloudflare.com';

export default function App() {
  const [quizId, setQuizId] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [score, setScore] = useState(null);

  const loadQuiz = async () => {
    try {
      const res = await axios.get(`${API}/api/quizzes/${quizId}`);
      setQuiz(res.data);

      const session = await axios.post(`${API}/api/start`, { quizId: parseInt(quizId) });
      setSessionId(session.data.id);
    } catch (err) {
      alert('Не удалось загрузить квиз: ' + err.response?.data || err.message);
    }
  };

  const submit = async () => {
    try {
      const res = await axios.post(`${API}/api/submit`, { sessionId, answers });
      setScore(res.data.score);
    } catch (err) {
      alert('Ошибка при отправке: ' + err.message);
    }
  };

  if (!quiz) {
    return (
      <div style={{ padding: 30, textAlign: 'center' }}>
        <h1>Квиз приложение</h1>
        <input
          value={quizId}
          onChange={e => setQuizId(e.target.value)}
          placeholder="Введите ID квиза"
          style={{ padding: 12, fontSize: 18, width: 250 }}
        />
        <button onClick={loadQuiz} style={{ padding: '12px 20px', marginLeft: 10 }}>
          Начать квиз
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>{quiz.title}</h1>
      {quiz.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 25 }}>
          <p><strong>{q.text}</strong></p>
          {q.options.map((opt, idx) => (
            <label key={idx} style={{ display: 'block', margin: '10px 0' }}>
              <input
                type="radio"
                name={`q${i}`}
                onChange={() => {
                  const newAnswers = [...answers];
                  newAnswers[i] = opt;
                  setAnswers(newAnswers);
                }}
              /> {opt}
            </label>
          ))}
        </div>
      ))}
      <button onClick={submit} style={{ padding: '15px 30px', fontSize: 18 }}>
        Завершить и увидеть результат
      </button>

      {score !== null && <h2 style={{ marginTop: 30 }}>Ваш результат: {score} баллов</h2>}
    </div>
  );
}