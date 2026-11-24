// api/analyze.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing on Vercel.' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sender = String(payload.sender || '').slice(0, 300);
    const subject = String(payload.subject || '').slice(0, 500);
    const body = String(payload.body || '').slice(0, 4000);

    const prompt = `Analyze this email for phishing. Return ONLY valid JSON with keys: "score" (number 0-100), "verdict" ("Safe" | "Suspicious" | "Phishing"), and "reason" (1-2 concise sentences).
Sender: ${sender}
Subject: ${subject}
Body: ${body}`;

    // Fastest, least-congested models first
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    let lastError = 'All models are currently busy. Please try again.';

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 200,
                temperature: 0.1
              }
            })
          }
        );

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text
            .replace(/```json|```/g, '')
            .trim();
          return res.status(200).json(JSON.parse(rawText));
        }

        lastError = data.error?.message || lastError;
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        lastError = fetchErr.name === 'AbortError' ? `${model} timed out` : fetchErr.message;
      }
    }

    return res.status(503).json({ error: lastError });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}