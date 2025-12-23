const express = require("express");
const { spawn } = require("child_process");
const log = require("./logger/log.js");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= WEB SERVER ================= */
app.get("/", (req, res) => {
  res.send("🤖 GoatBot V2 is running | April Manalo");
});

app.get("/api/status", (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: "online",
    uptime: `${Math.floor(uptime / 60)} minutes`,
    version: "1.5.35",
    author: "April Manalo"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

/* ================= BOT PROCESS ================= */
function startProject() {
  const child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (code) => {
    if (code == 2) {
      log.info("Restarting Project...");
      startProject();
    }
  });
}

startProject();
