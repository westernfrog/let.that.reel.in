const express = require("express");
const localtunnel = require("localtunnel");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { server, outputDir } = require("./config/config");
const routes = require("./src/routes");

const app = express();
app.use(bodyParser.json());
app.use("/static", express.static(outputDir));
app.use("/api", routes);

app.get("/", (req, res) => {
  const files = fs
    .readdirSync(outputDir)
    .filter((file) => file.endsWith(".mp4"));
  const fileLinks = files
    .map((file) => `<li><a href="/static/${file}">${file}</a></li>`)
    .join("");
  res.send(`<ul>${fileLinks}</ul>`);
});

app.listen(server.port, async () => {
  console.log(`🚀 Server running on port ${server.port}`);

  try {
    const tunnel = await localtunnel({ port: server.port });

    app.locals.tunnelUrl = tunnel.url; // Store the URL
    console.log(`🌍 LocalTunnel established at: ${tunnel.url}`);

    tunnel.on("close", () => {
      console.log("🛑 LocalTunnel closed");
    });
  } catch (error) {
    console.error("❌ Error starting LocalTunnel:", error);
  }
});
