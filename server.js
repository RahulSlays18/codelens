const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));   // serves your index.html

// ── Page routes ──
const path = require('path');
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✓ Server running on http://localhost:${PORT}`)
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
const { randomUUID } = require('crypto');

// Create challenge
app.post('/challenge/create', verifyToken, (req, res) => {
  const { code, lang, result } = req.body;
  const id = randomUUID();
  db.prepare(`INSERT INTO challenges (id,owner_id,owner_code,owner_lang,owner_result)
              VALUES (?,?,?,?,?)`)
    .run(id, req.user.id, code, lang, JSON.stringify(result));
  res.json({ challengeId: id, link: `/challenge/${id}` });
});

// Accept challenge + AI judge
app.post('/challenge/submit', verifyToken, async (req, res) => {
  const { challengeId, code, lang, result } = req.body;
  const challenge = db.prepare('SELECT * FROM challenges WHERE id=?').get(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  // Ask Groq to judge
  const prompt = `Compare these two code snippets and return ONLY valid JSON:
{
  "same_problem": true,
  "problem_summary": "what problem both solve",
  "winner": "A or B or tie",
  "reason": "one sentence why",
  "a_complexity": "O(...)",
  "b_complexity": "O(...)"
}
Code A (${challenge.owner_lang}):
${challenge.owner_code}

Code B (${lang}):
${code}`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 500, temperature: 0.1,
      messages: [{ role: 'user', content: prompt }] }),
  });
  const groqData = await groqRes.json();
  const raw = groqData.choices?.[0]?.message?.content || '{}';
  const verdict = JSON.parse(raw.replace(/```json|```/g, '').trim());

  db.prepare(`UPDATE challenges SET rival_id=?,rival_code=?,rival_lang=?,rival_result=?,verdict=? WHERE id=?`)
    .run(req.user.id, code, lang, JSON.stringify(result), JSON.stringify(verdict), challengeId);

  res.json({ verdict, challenge });
});

// Get challenge result
app.get('/challenge/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM challenges WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});