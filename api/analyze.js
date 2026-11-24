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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini API Error:', JSON.stringify(data));
      return res.status(500).json({
        error: data.error?.message || 'Unexpected response from Gemini API'
      });
    }

    const rawText = data.candidates[0].content.parts[0].text
      .replace(/```json|```/g, '')
      .trim();

    const result = JSON.parse(rawText);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Server crash:', err);
    return res.status(500).json({ error: err.message });
  }
}