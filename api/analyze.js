// api/analyze.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sender, subject, body } = req.body;
  const prompt = `Analyze this email for phishing. Return ONLY valid JSON with keys: "score" (0-100), "verdict" ("Safe" | "Suspicious" | "Phishing"), and "reason" (short string).\nSender: ${sender}\nSubject: ${subject}\nBody: ${body}`;

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
  const result = JSON.parse(data.candidates[0].content.parts[0].text);
  return res.status(200).json(result);
}