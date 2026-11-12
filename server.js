const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// PASTE YOUR GEMINI API KEY HERE
const GEMINI_API_KEY = "PASTE_YOUR_KEY_HERE"; 

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.post('/api/generate-exam', async (req, res) => {
  const { schemeText, w1, w2 } = req.body;
  if (!schemeText) return res.status(400).json({ error: "No scheme provided." });

  const prompt = `You are a strict school teacher. Scheme of work: "${schemeText}". Generate exactly 5 multiple choice questions covering ONLY topics between Week ${w1} and Week ${w2}. Return ONLY a JSON array: [{"question": "...", "options": ["A","B","C","D"], "answer": 0}] Where "answer" is the index (0 to 3).`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    let aiText = data.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json({ questions: JSON.parse(aiText) });
  } catch (error) {
    res.status(500).json({ error: "AI failed to generate. Check key." });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `You are a helpful school tutor. Keep it simple. Student asks: ${message}` }] }] })
    });
    const data = await response.json();
    res.json({ reply: data.candidates[0].content.parts[0].text });
  } catch (error) {
    res.status(500).json({ error: "AI failed to respond." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running'));
