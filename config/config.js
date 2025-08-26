require("dotenv").config();

module.exports = {
  youtube: {
    chunkLength: 90,
    targetWidth: 1080,
    targetHeight: 1920,
    contentHeightPercent: 0.5,
    fontPath: "public/fonts/FunnelSans-SemiBold.ttf",
  },
  instagram: {
    accessToken: process.env.ACCESS_TOKEN,
    userId: process.env.USER_ID,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  server: {
    port: process.env.PORT,
  },
  outputDir: "public/reels",
};
