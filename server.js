const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));   // serves your index.html

app.post('/analyze', async (req, res) => {
  const { code, lang } = req.body;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: `Return ONLY valid JSON with nodes, edges, complexity.` },
        { role: 'user',   content: `Language: ${lang}\n\nCode:\n${code}` },
      ],
    }),
  });

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content || '{}';
  res.json(JSON.parse(raw.replace(/```json|```/g, '').trim()));
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('./db');

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password) VALUES (?,?)').run(username, hash);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Username taken' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Wrong credentials' });
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

// Save analysis (protected)
app.post('/save', verifyToken, (req, res) => {
  const { code, language, result } = req.body;
  db.prepare('INSERT INTO analyses (user_id,code,language,result) VALUES (?,?,?,?)')
    .run(req.user.id, code, language, JSON.stringify(result));
  res.json({ ok: true });
});

// Get history (protected)
app.get('/history', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM analyses WHERE user_id=? ORDER BY created DESC LIMIT 20')
    .all(req.user.id);
  res.json(rows);
});

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}