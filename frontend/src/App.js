import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

export default function App() {
  const [mode, setMode] = useState('menu');
  const [user, setUser] = useState(null);

  if (!user) return <Auth setUser={setUser} />;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>Quiz Platform 🚀</h1>

      {mode === 'menu' && (
        <>
          <button onClick={() => setMode('create')}>Create</button>
          <button onClick={() => setMode('play')}>Play</button>
          <button onClick={() => setMode('results')}>Results</button>
        </>
      )}

      {mode === 'create' && <CreateQuiz />}
      {mode === 'play' && <PlayQuiz />}
      {mode === 'results' && <Results />}
    </div>
  );
}

function Auth({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    const res = await axios.post(`${API}/api/login`, { email, password });
    setUser(res.data);
  };

  const register = async () => {
    const res = await axios.post(`${API}/api/register`, { email, password });
    setUser(res.data);
  };

  return (
    <div>
      <h2>Login / Register</h2>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
      <button onClick={register}>Register</button>
    </div>
  );
}

function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', ''], correct: '', type: 'single' }]);
  };

  const save = async () => {
    const res = await axios.post(`${API}/api/quizzes`, { title, questions });
    alert('Created ID: ' + res.data.id);
  };

  return (
    <div>
      <h2>Create Quiz</h2>
      <input placeholder="Title" onChange={e => setTitle(e.target.value)} />

      {questions.map((q, i) => (
        <div key={i} style={{ border: '1px solid gray', margin: 10, padding: 10 }}>
          <input placeholder="Question" onChange={e => { const nq=[...questions]; nq[i].text=e.target.value; setQuestions(nq); }} />

          <select onChange={e => { const nq=[...questions]; nq[i].type=e.target.value; setQuestions(nq); }}>
            <option value="single">Single</option>
            <option value="multi">Multi</option>
            <option value="number">Number</option>
          </select>

          {q.options.map((opt, idx) => (
            <input key={idx} placeholder={`Option ${idx+1}`} onChange={e => {
              const nq=[...questions]; nq[i].options[idx]=e.target.value; setQuestions(nq);
            }} />
          ))}

          <input placeholder="Correct" onChange={e => {
            const nq=[...questions]; nq[i].correct=e.target.value; setQuestions(nq);
          }} />
        </div>
      ))}

      <button onClick={addQuestion}>Add Question</button>
      <button onClick={save}>Save</button>
    </div>
  );
}

function PlayQuiz() {
  const [quizId, setQuizId] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [score, setScore] = useState(null);

  const load = async () => {
    const res = await axios.get(`${API}/api/quizzes/${quizId}`);
    setQuiz(res.data);

    const s = await axios.post(`${API}/api/start`, { quizId });
    setSessionId(s.data.id);
  };

  const submit = async () => {
    const res = await axios.post(`${API}/api/submit`, { sessionId, answers });
    setScore(res.data.score);
  };

  if (!quiz) {
    return (
      <div>
        <input placeholder="Quiz ID" onChange={e => setQuizId(e.target.value)} />
        <button onClick={load}>Start</button>
      </div>
    );
  }

  return (
    <div>
      <h2>{quiz.title}</h2>

      {quiz.questions.map((q, i) => (
        <div key={i}>
          <p>{q.text}</p>
          {q.options.map((opt, idx) => (
            <label key={idx}>
              <input type="radio" name={i} onChange={() => {
                const na=[...answers]; na[i]=opt; setAnswers(na);
              }} /> {opt}
            </label>
          ))}
        </div>
      ))}

      <button onClick={submit}>Finish</button>
      {score !== null && <h3>Score: {score}</h3>}
    </div>
  );
}

function Results() {
  const [data, setData] = useState([]);

  const load = async () => {
    const res = await axios.get(`${API}/api/results`);
    setData(res.data);
  };

  return (
    <div>
      <button onClick={load}>Load Results</button>
      {data.map(r => (
        <div key={r.id}>Quiz: {r.quizId} | Score: {r.score}</div>
      ))}
    </div>
  );
}