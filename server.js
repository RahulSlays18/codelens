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