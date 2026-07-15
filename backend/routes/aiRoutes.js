// ============================================================
// NovaChat - AI Routes (OpenRouter-powered features)
// ============================================================
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const OpenAI = require("openai");

router.use(protect);

// Initialize OpenAI SDK configured for OpenRouter
const getOpenRouterClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
    return null;
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "NovaChat",
    },
  });
};

const DEFAULT_MODEL = "meta-llama/llama-3-8b-instruct:free";

// AI Chat Assistant
router.post("/chat", async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const openai = getOpenRouterClient();

    if (!openai) {
      return res.json({
        success: true,
        response: "I'm Nova, your AI assistant! 🤖 To enable full AI capabilities, please add your OpenRouter API key to the backend .env file.",
        tokensUsed: 0,
      });
    }

    const messages = [
      {
        role: "system",
        content: "You are Nova, a helpful AI assistant built into the NovaChat messaging platform. Be concise, friendly, and helpful.",
      },
      ...conversationHistory.slice(-10),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({
      success: true,
      response: completion.choices[0].message.content,
      tokensUsed: completion.usage?.total_tokens || 0,
    });
  } catch (error) {
    next(error);
  }
});

// AI Translate
router.post("/translate", async (req, res, next) => {
  try {
    const { text, targetLanguage } = req.body;
    const openai = getOpenRouterClient();

    if (!openai) {
      return res.json({ success: true, translatedText: text, note: "Add OpenRouter API key for translation" });
    }

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else.`,
        },
        { role: "user", content: text },
      ],
      max_tokens: 500,
    });

    res.json({ success: true, translatedText: completion.choices[0].message.content });
  } catch (error) {
    next(error);
  }
});

// AI Chat Summary
router.post("/summarize", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const openai = getOpenRouterClient();

    if (!openai) {
      return res.json({ success: true, summary: "Add OpenRouter API key for chat summarization", keyPoints: [] });
    }

    const chatText = messages.map((m) => `${m.sender}: ${m.content}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "Summarize this chat conversation in 3-5 bullet points. Return JSON with 'summary' (string) and 'keyPoints' (array of strings).",
        },
        { role: "user", content: chatText },
      ],
      max_tokens: 400,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// AI Auto-reply suggestions
router.post("/suggest-reply", async (req, res, next) => {
  try {
    const { lastMessage } = req.body;
    const openai = getOpenRouterClient();

    if (!openai) {
      return res.json({ success: true, suggestions: ["Sure!", "Got it!", "Thanks for letting me know!"] });
    }

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "Generate 3 short, natural reply suggestions for a chat message. Return JSON with 'suggestions' array of strings.",
        },
        { role: "user", content: `Message: "${lastMessage}"` },
      ],
      max_tokens: 200,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ success: true, suggestions: result.suggestions || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
