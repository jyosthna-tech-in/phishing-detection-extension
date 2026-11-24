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
    const { sender = '', subject = '', body = '' } = payload;

    const prompt = `Analyze this email for phishing. Return ONLY valid JSON with keys: "score" (number 0-100), "verdict" ("Safe" | "Suspicious" | "Phishing"), and "reason" (short string).
Sender: ${sender}
Subject: ${subject}
Body: ${body}`;

    const models = ['gemini-3.8-flash', 'gemini-3.8-flash-lite'];
    let lastError = 'Unexpected response from Gemini API';

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text
          .replace(/```json|```/g, '')
          .trim();
        return res.status(200).json(JSON.parse(rawText));
      }

      lastError = data.error?.message || lastError;
    }

    return res.status(503).json({ error: lastError });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}