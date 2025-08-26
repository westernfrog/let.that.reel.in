const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { instagram, outputDir } = require("../../config/config");
const { generateRandomCaption } = require("../utils/gemini");

const ensureInstagramReady = (filePath) => {
  const outputFile = filePath.replace(".mp4", "_ready.mp4");

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      filePath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-profile:v",
      "high",
      "-level",
      "4.1",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputFile,
    ],
    { stdio: "inherit" }
  );

  if (result.error) {
    console.error("❌ ffmpeg error:", result.error.message);
    return filePath;
  }

  return outputFile;
};

const pollStatus = async (mediaId) => {
  let attempts = 0;
  const maxAttempts = 100;
  const delay = 7000;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `https://graph.instagram.com/v23.0/${mediaId}`,
        {
          params: {
            fields: "status_code",
            access_token: instagram.accessToken,
          },
        }
      );

      const { status_code } = response.data;
      console.log(
        `⌛ Upload Status [${attempts}]: ${status_code} ${JSON.stringify(
          response.data
        )}`
      );

      if (status_code === "FINISHED") return true;
      if (status_code === "ERROR") return false;

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`❌ Error polling status: ${error.message}`);
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error("❌ Media processing timeout.");
  return false;
};

const upload = async (tunnelUrl) => {
  try {
    const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".mp4"));

    if (files.length === 0) {
      console.log("📁 No .mp4 files found in output directory.");
      return;
    }

    const uploader = fs.existsSync(path.join(outputDir, "uploader.txt"))
      ? fs.readFileSync(path.join(outputDir, "uploader.txt"), "utf-8").trim()
      : "Unknown Creator";

    const uploadDelay = 60000;

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      const filePath = path.join(outputDir, file);

      const safeFile = ensureInstagramReady(filePath);
      const safeFileName = path.basename(safeFile);

      const videoUrl = `${tunnelUrl}/static/${safeFileName}`;
      console.log(`🎬 Preparing upload: ${safeFileName} -> ${videoUrl}`);

      try {
        const randomCaptionText = await generateRandomCaption();
        const fullCaption = `${randomCaptionText}\n\n🎥 Credit: ${uploader}`;

        const createContainer = await axios.post(
          `https://graph.instagram.com/v23.0/${instagram.userId}/media`,
          {
            media_type: "REELS",
            video_url: videoUrl,
            caption: fullCaption,
            access_token: instagram.accessToken,
          }
        );

        const mediaId = createContainer.data.id;
        console.log(`📤 Uploaded container ID: ${mediaId}`);

        if (mediaId && (await pollStatus(mediaId))) {
          const publish = await axios.post(
            `https://graph.instagram.com/v23.0/${instagram.userId}/media_publish`,
            {
              creation_id: mediaId,
              access_token: instagram.accessToken,
            }
          );

          const postId = publish.data.id;
          console.log(`🥳 Reel Published: Post ID ${postId}`);
        } else {
          console.error(`❌ Failed to process media: ${file}`);

          console.log("🔁 Retrying upload once...");
          i--;
        }
      } catch (e) {
        console.error(
          `❌ Failed upload: ${file}`,
          e.response?.data || e.message
        );
      }

      if (i < files.length - 1) {
        console.log(`⏳ Waiting ${uploadDelay / 1000}s before next...`);
        await new Promise((res) => setTimeout(res, uploadDelay));
      }
    }
  } catch (error) {
    console.error("❌ Error in upload function:", error.message);
  }
};

module.exports = { upload };
