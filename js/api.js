// ─── GROQ API CALL ───────────────────────────────────────────────────
async function callGroqAPI(code, lang) {
  const systemPrompt = `You are a code analysis engine. Given a code snippet, return ONLY a valid JSON object (no markdown, no backticks, no explanation) with this exact structure:
{
  "nodes": [
    { "id": "n1", "label": "Entry: functionName", "type": "entry" },
    { "id": "n2", "label": "if condition", "type": "condition" },
    { "id": "n3", "label": "return result", "type": "return" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3" }
  ],
  "complexity": {
    "time": "O(log n)",
    "timeExplain": "Binary search halves the search space each iteration.",
    "space": "O(1)",
    "spaceExplain": "Only two pointer variables are used, no extra data structures.",
    "tip": "Consider returning the insertion point on miss for use in sorted-insert scenarios."
  }
}
Node types: entry, return, condition, loop, call, assign.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Language: ${lang}\n\nCode:\n${code}` },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}
