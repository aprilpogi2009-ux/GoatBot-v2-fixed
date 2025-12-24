const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    version: "1.0.0",
    author: "April Manalo",
    role: 0,
    category: "music",
    guide: "spotify <song name>"
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ").trim();
    if (!query) {
      return api.sendMessage(
        "⚠️ Usage: -spotify <song name>",
        event.threadID,
        String(event.messageID)
      );
    }

    try {
      api.sendMessage("🔎 Searching Spotify...", event.threadID);

      const search = await axios.get(
        "https://norch-project.gleeze.com/api/spotify",
        { params: { q: query } }
      );

      const results = search.data?.results?.slice(0, 5);
      if (!results || results.length === 0) {
        return api.sendMessage(
          "❌ No results found.",
          event.threadID
        );
      }

      let msg = "🎧 Spotify Results:\n\n";
      results.forEach((r, i) => {
        msg += `${i + 1}. ${r.title}\n👤 ${r.artist}\n⏱ ${r.duration}\n\n`;
      });
      msg += "👉 Reply with number (1-5)";

      const sent = await api.sendMessage(msg, event.threadID);

      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: sent.messageID,
        author: event.senderID,
        type: "spotify_select",
        results
      });

    } catch (err) {
      console.error("[SPOTIFY SEARCH ERROR]", err);
      api.sendMessage("❌ Failed to search Spotify.", event.threadID);
    }
  },

  handleReply: async function ({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;

    const index = parseInt(event.body);
    if (isNaN(index) || index < 1 || index > handleReply.results.length) {
      return api.sendMessage(
        "❌ Invalid choice. Reply 1–5 only.",
        event.threadID,
        String(event.messageID)
      );
    }

    const song = handleReply.results[index - 1];

    try {
      api.sendMessage("⏳ Downloading song...", event.threadID);

      const dl = await axios.get(
        "https://norch-project.gleeze.com/api/spotify-dl-v2",
        { params: { url: song.spotify_url } }
      );

      const data = dl.data?.trackData?.[0];
      if (!data?.download_url) {
        return api.sendMessage("❌ Download failed.", event.threadID);
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const mp3Path = path.join(cacheDir, `${Date.now()}.mp3`);
      const imgPath = path.join(cacheDir, `${Date.now()}.jpg`);

      // download mp3
      const mp3 = await axios.get(data.download_url, { responseType: "arraybuffer" });
      fs.writeFileSync(mp3Path, Buffer.from(mp3.data));

      // download cover
      const img = await axios.get(data.image, { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(img.data));

      // send cover + info
      await api.sendMessage({
        body: `🎵 ${data.name}\n👤 ${data.artists}`,
        attachment: fs.createReadStream(imgPath)
      }, event.threadID);

      // send mp3 as voice
      await api.sendMessage({
        attachment: fs.createReadStream(mp3Path)
      }, event.threadID);

      // cleanup
      fs.unlinkSync(mp3Path);
      fs.unlinkSync(imgPath);

      global.client.handleReply =
        global.client.handleReply.filter(h => h.messageID !== handleReply.messageID);

    } catch (err) {
      console.error("[SPOTIFY DL ERROR]", err);
      api.sendMessage("❌ Error downloading song.", event.threadID);
    }
  }
};
