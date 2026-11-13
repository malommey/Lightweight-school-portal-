const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ✅ GROQ API SETUP
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_API_KEY) {
  console.error("❌ ERROR: GROQ_API_KEY is missing from Render Environment Variables!");
}

app.post('/api/generate-exam', async (req, res) => {
  const { schemeText, w1, w2 } = req.body;
  if (!schemeText) return res.status(400).json({ error: "No scheme provided." });

  const prompt = `You are a strict school teacher. Scheme of work: "${schemeText}". Generate exactly 5 multiple choice questions covering ONLY topics between Week ${w1} and Week ${w2}. Return ONLY a JSON array: [{"question": "...", "options": ["A","B","C","D"], "answer": 0}] Where "answer" is the index (0 to 3).`;

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", // Groq's fast and smart model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let aiText = data.choices[0].message.content;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json({ questions: JSON.parse(aiText) });
  } catch (error) {
    console.error("EXAM ERROR:", error);
    res.status(500).json({ error: "AI failed to generate." });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:  "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a helpful, encouraging school tutor for students. Keep explanations simple, clear, and educational." },
          { role: "user", content: message }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({ error: "AI failed to respond." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running with Groq'));
