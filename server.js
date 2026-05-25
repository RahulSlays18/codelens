const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const bcrypt         = require('bcrypt');
const jwt            = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const db             = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ── Page routes ──────────────────────────────
app.get('/login',         (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/',              (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/challenge/:id', (req, res) => res.sendFile(path.join(__dirname, 'challenge.html')));

// ── Analyze ──────────────────────────────────
app.post('/analyze', async (req, res) => {
  const { code, lang } = req.body;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  1000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: `You are a code analyzer. Return ONLY valid JSON with this exact structure, no extra text:
{
  "nodes": [
    { "id": "n1", "label": "descriptive label here", "type": "entry|return|condition|loop|call|assign" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" }
  ],
  "complexity": {
    "time": "O(...)",
    "timeExplain": "one sentence explanation",
    "space": "O(...)",
    "spaceExplain": "one sentence explanation",
    "tip": "one concrete optimization suggestion"
  }
}
Node types must be one of: entry, return, condition, loop, call, assign.
Labels must be descriptive (e.g. "Entry: fib_iterative", "if n <= 1", "for _ in range", "return b").
The tip field must always have a specific, useful suggestion — never leave it empty.` },
        { role: 'user', content: `Language: ${lang}\n\nCode:\n${code}` },
      ],
    }),
  });
  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content || '{}';
  res.json(JSON.parse(raw.replace(/```json|```/g, '').trim()));
});

// ── Auth middleware ───────────────────────────
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Register ──────────────────────────────────
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

// ── Login ─────────────────────────────────────
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Wrong credentials' });
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

// ── Save analysis ─────────────────────────────
app.post('/save', verifyToken, (req, res) => {
  const { code, language, result } = req.body;
  db.prepare('INSERT INTO analyses (user_id,code,language,result) VALUES (?,?,?,?)')
    .run(req.user.id, code, language, JSON.stringify(result));
  res.json({ ok: true });
});

// ── Get history ───────────────────────────────
app.get('/history', verifyToken, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM analyses WHERE user_id=? ORDER BY created DESC LIMIT 20'
  ).all(req.user.id);
  res.json(rows);
});

// ── Search users ──────────────────────────────
app.get('/users/search', (req, res) => {
  const q = req.query.q || '';
  if (q.length < 2) return res.json([]);
  const users = db.prepare(
    'SELECT id, username, trophies FROM users WHERE username LIKE ? LIMIT 8'
  ).all(`%${q}%`);
  res.json(users);
});

// ── Get user profile (trophies) ───────────────
app.get('/profile/:username', (req, res) => {
  const user = db.prepare('SELECT id, username, trophies FROM users WHERE username=?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// ── Competitor requests ───────────────────────
app.post('/competitor/request', verifyToken, (req, res) => {
  const { to_user } = req.body;
  if (to_user === req.user.username)
    return res.status(400).json({ error: "You can't add yourself as a competitor" });
  try {
    db.prepare(
      'INSERT INTO competitor_requests (from_user, to_user) VALUES (?, ?)'
    ).run(req.user.username, to_user);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Request already sent' });
  }
});

app.get('/competitor/requests', verifyToken, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM competitor_requests WHERE to_user = ? AND status = 'pending'"
  ).all(req.user.username);
  res.json(rows);
});

app.post('/competitor/respond', verifyToken, (req, res) => {
  const { from_user, action } = req.body;
  db.prepare(
    'UPDATE competitor_requests SET status = ? WHERE from_user = ? AND to_user = ?'
  ).run(action === 'accept' ? 'accepted' : 'declined', from_user, req.user.username);
  res.json({ ok: true });
});

app.get('/competitor/accepted', verifyToken, (req, res) => {
  const username = req.user.username;
  const rows = db.prepare(`
    SELECT * FROM competitor_requests
    WHERE (from_user = ? OR to_user = ?)
    AND status = 'accepted'
  `).all(username, username);

  const seen = new Set();
  const competitors = [];
  for (const r of rows) {
    const other = r.from_user === username ? r.to_user : r.from_user;
    if (!seen.has(other)) {
      seen.add(other);
      competitors.push({ username: other });
    }
  }
  res.json(competitors);
});

// ── Create challenge ──────────────────────────
app.post('/challenge/create', verifyToken, (req, res) => {
  const { code, lang, result } = req.body;
  const id = randomUUID();
  db.prepare(`
    INSERT INTO challenges (id,owner_id,owner_name,owner_code,owner_lang,owner_result)
    VALUES (?,?,?,?,?,?)
  `).run(id, req.user.id, req.user.username, code, lang, JSON.stringify(result));
  res.json({ challengeId: id, link: `/challenge/${id}` });
});

// ── Get challenge data ────────────────────────
app.get('/challenge/data/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM challenges WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

// ── Submit challenge ──────────────────────────
app.post('/challenge/submit', verifyToken, async (req, res) => {
  const { challengeId, code, lang, result } = req.body;
  const challenge = db.prepare('SELECT * FROM challenges WHERE id=?').get(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  if (challenge.rival_id) return res.status(400).json({ error: 'Challenge already completed' });

  const prompt = `Compare these two code snippets and return ONLY valid JSON:
{
  "same_problem": true,
  "problem_summary": "what problem both solve in one sentence",
  "winner": "A or B or tie",
  "reason": "one sentence explaining why the winner is better",
  "a_complexity": "O(...)",
  "b_complexity": "O(...)"
}
Code A (${challenge.owner_lang}) by ${challenge.owner_name}:
${challenge.owner_code}

Code B (${lang}) by ${req.user.username}:
${code}`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', max_tokens: 500, temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const groqData = await groqRes.json();
  const raw      = groqData.choices?.[0]?.message?.content || '{}';
  const verdict  = JSON.parse(raw.replace(/```json|```/g, '').trim());

  db.prepare(`
    UPDATE challenges
    SET rival_id=?, rival_name=?, rival_code=?, rival_lang=?, rival_result=?, verdict=?
    WHERE id=?
  `).run(req.user.id, req.user.username, code, lang, JSON.stringify(result), JSON.stringify(verdict), challengeId);

  // ── Award trophy to winner ──
  if (verdict.winner === 'A') {
    db.prepare('UPDATE users SET trophies = trophies + 1 WHERE id = ?').run(challenge.owner_id);
  } else if (verdict.winner === 'B') {
    db.prepare('UPDATE users SET trophies = trophies + 1 WHERE id = ?').run(req.user.id);
  }

  res.json({ verdict, challenge });
});

// ── Start ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));