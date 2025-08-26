const axios = require("axios");
const { gemini } = require("../../config/config");

const generateRandomCaption = async () => {
  try {
    const prompt =
      "Tell me a completely random, surprising, or obscure fact about anything — science, history, space, psychology, technology, nature, or even something weird or hilarious. Make it mid length, fascinating, and unexpected.";
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemini.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    const text = res.data.candidates[0]?.content?.parts?.[0]?.text?.trim();
    return text || "🎬 Check this out!";
  } catch (error) {
    console.error("Gemini API failed:", error.response?.data || error.message);
    return "✨ Don't miss this clip!";
  }
};

module.exports = { generateRandomCaption };
