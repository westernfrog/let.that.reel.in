const { exec, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { youtube, outputDir } = require("../../config/config");
const { createOutputDirectory, cleanupFiles } = require("../utils/helpers");

function wrapText(text, maxCharsPerLine = 38, maxLines = 3) {
  if (text.length <= maxCharsPerLine) return [text];
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (
      currentLine.length > 0 &&
      currentLine.length + word.length + 1 > maxCharsPerLine
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine.length > 0 ? " " : "") + word;
    }
  }
  lines.push(currentLine);

  if (lines.length > 1) {
    const lastLine = lines[lines.length - 1];
    const secondLastLine = lines[lines.length - 2];
    if (lastLine.split(" ").length === 1 && lastLine.length < 10) {
      const secondLastWords = secondLastLine.split(" ");
      if (secondLastWords.length > 1) {
        const wordToMove = secondLastWords.pop();
        lines[lines.length - 2] = secondLastWords.join(" ");
        lines[lines.length - 1] = wordToMove + " " + lastLine;
      }
    }
  }
  return lines.slice(0, maxLines);
}

const reelify = (ytUrl) => {
  return new Promise((resolve, reject) => {
    createOutputDirectory(outputDir);
    const inputFilePath = path.join(outputDir, "input.mp4");
    const titleFilePath = path.join(outputDir, "title.txt");
    const uploaderFilePath = path.join(outputDir, "uploader.txt");

    exec(
      `yt-dlp --print "%(title)s\n%(uploader)s" "${ytUrl}"`,
      (error, stdout, stderr) => {
        if (error)
          return reject(new Error(`Failed to fetch metadata: ${stderr}`));

        const [videoTitle, videoUploader] = stdout.trim().split("\n");
        const wrappedTitleLines = wrapText(videoTitle);
        fs.writeFileSync(titleFilePath, wrappedTitleLines.join("\n"));
        fs.writeFileSync(uploaderFilePath, videoUploader);

        execFile(
          "yt-dlp",
          [
            "-f",
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o",
            inputFilePath,
            "--merge-output-format",
            "mp4",
            ytUrl,
          ],
          (error) => {
            if (error)
              return reject(
                new Error(`Video download failed: ${error.message}`)
              );

            exec(
              `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFilePath}"`,
              (error, stdout) => {
                if (error)
                  return reject(
                    new Error(`Failed to read video duration: ${error.message}`)
                  );
                const totalSeconds = parseInt(stdout, 10);
                if (isNaN(totalSeconds))
                  return reject(new Error("Invalid video duration"));

                const contentTop = Math.floor(
                  (youtube.targetHeight * (1 - youtube.contentHeightPercent)) /
                    2
                );
                const videoBottom = youtube.targetHeight - contentTop;
                const titleY =
                  contentTop - 100 - (wrappedTitleLines.length - 1) * 45;
                const partY = videoBottom + 40;
                const totalParts = Math.ceil(
                  totalSeconds / youtube.chunkLength
                );

                if (totalParts === 0) {
                  cleanupFiles([inputFilePath, titleFilePath]);
                  return resolve({ uploader: videoUploader });
                }

                const processPart = (i) => {
                  if (i >= totalParts) {
                    cleanupFiles([inputFilePath, titleFilePath]);
                    return resolve({ uploader: videoUploader });
                  }

                  const startTime = i * youtube.chunkLength;
                  const outputName = path.join(
                    outputDir,
                    `reel_${String(i).padStart(3, "0")}.mp4`
                  );
                  const part = i + 1;

                  const vf_opts = [
                    `scale=-1:${
                      youtube.targetHeight * youtube.contentHeightPercent
                    }:flags=lanczos`,
                    `crop=${youtube.targetWidth}:${
                      youtube.targetHeight * youtube.contentHeightPercent
                    }`,
                    `pad=${youtube.targetWidth}:${youtube.targetHeight}:(ow-iw)/2:${contentTop}:color=white`,

                    `drawtext=fontfile=${youtube.fontPath}:textfile='${titleFilePath}':x=(w-text_w)/2:y=${titleY}:fontcolor=black:fontsize=44:line_spacing=10:box=1:boxcolor=white@0.9:boxborderw=8`,
                    `drawtext=fontfile=${youtube.fontPath}:text='Part ${part}':x=(w-text_w)/2:y=${partY}:fontcolor=black:fontsize=44:box=1:boxcolor=white@0.9:boxborderw=6`,
                  ].join(",");

                  const ffmpegArgs = [
                    "-ss",
                    startTime,
                    "-i",
                    inputFilePath,
                    "-t",
                    youtube.chunkLength,
                    "-vf",
                    vf_opts,

                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "16",
                    "-profile:v",
                    "high",
                    "-level",
                    "4.0",
                    "-tune",
                    "film",

                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-ar",
                    "44100",

                    "-r",
                    "30",
                    "-pix_fmt",
                    "yuv420p",
                    "-movflags",
                    "+faststart",
                    "-threads",
                    "0",

                    outputName,
                    "-y",
                  ];

                  console.log(
                    `🎬 Processing part ${part}/${totalParts} with optimized quality settings...`
                  );

                  execFile("ffmpeg", ffmpegArgs, (error) => {
                    if (error) {
                      console.error(`❌ Failed part ${part}:`, error);
                    } else {
                      console.log(`✅ Created high-quality: ${outputName}`);
                    }
                    processPart(i + 1);
                  });
                };

                console.log(
                  `🚀 Starting optimized processing of ${totalParts} parts...`
                );
                processPart(0);
              }
            );
          }
        );
      }
    );
  });
};

module.exports = { reelify };
