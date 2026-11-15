const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/generate-exam', async (req, res) => {
  const { schemeText, imageBase64, w1, w2, numQuestions } = req.body;
  
  if (!schemeText && !imageBase64) {
    return res.status(400).json({ error: "No scheme or image provided." });
  }

  const promptText = `You are a strict school teacher. Generate exactly ${numQuestions} multiple choice questions covering ONLY topics between Week ${w1} and Week ${w2}. Return ONLY a JSON array: [{"question": "...", "options": ["A","B","C","D"], "answer": 0}] Where "answer" is the index of the correct option (0 to 3).`;

  try {
    let aiText = "";

    if (imageBase64) {
      // --- USE GEMINI FOR IMAGES ---
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing in Render.");
      
      const base64Data = imageBase64.split(',')[1]; // Remove the data:image/jpeg;base64, prefix
      const mimeType = imageBase64.split(';')[0].split(':')[1];

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiText = data.candidates[0].content.parts[0].text;

    } else {
      // --- USE GROQ FOR TEXT ---
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: promptText + ` Here is the scheme of work: "${schemeText}"` }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiText = data.choices[0].message.content;
    }

    // Clean up the JSON
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json({ questions: JSON.parse(aiText) });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a helpful school tutor. Keep explanations simple and clear. Do NOT use markdown, asterisks, or tables. Use plain text only." },
          { role: "user", content: message }
        ]
      })
    });
    
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "AI failed to respond." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running with Groq and Gemini'));
