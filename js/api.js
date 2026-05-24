// ─── API CALL ─────────────────────────────────────────────────────────
// Calls your local Express server (/analyze) instead of Groq directly.
// This keeps your API key safe on the server side (server.js + .env).
async function callGroqAPI(code, lang) {
  const response = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, lang }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  return await response.json();
}