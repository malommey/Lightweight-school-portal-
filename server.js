const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for images

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_API_KEY) {
  console.error("❌ ERROR: GROQ_API_KEY is missing!");
}

app.post('/api/generate-exam', async (req, res) => {
  const { schemeText, imageBase64, w1, w2, numQuestions } = req.body;
  
  if (!schemeText && !imageBase64) {
    return res.status(400).json({ error: "No scheme or image provided." });
  }

  const promptText = `You are a strict school teacher. Generate exactly ${numQuestions} multiple choice questions covering ONLY topics between Week ${w1} and Week ${w2}. Return ONLY a JSON array: [{"question": "...", "options": ["A","B","C","D"], "answer": 0}] Where "answer" is the index of the correct option (0 to 3).`;

  // Prepare the message payload (Text or Image+Text)
  let messageContent = [];
  
  if (imageBase64) {
    messageContent.push({ type: "text", text: promptText + " Read the attached scheme of work image to generate the questions." });
    messageContent.push({ type: "image_url", image_url: { url: imageBase64 } });
  } else {
    messageContent.push({ type: "text", text: promptText + ` Here is the scheme of work: "${schemeText}"` });
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: imageBase64 ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-120b", // Use vision model if image exists
        messages: [{ role: "user", content: messageContent }],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let aiText = data.choices[0].message.content;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json({ questions: JSON.parse(aiText) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI failed to generate. Check logs." });
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
app.listen(PORT, () => console.log('Server running with Groq Vision'));
