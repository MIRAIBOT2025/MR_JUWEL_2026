const fs = require("fs");
const axios = require("axios");

let lastPlayed = -1;

module.exports = {
  config: {
    name: "gan1",
    version: "1.0.0",
    role: 0,
    author: "MR JUWEL",
    shortDescription: "Play random song with prefix command 🎶",
    longDescription: "Sends a random mp3 song from a preset list (Google Drive direct links).",
    category: "music",
    guide: {
      en: "{p}gan"
    }
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID } = event;

    const songLinks = [
      "https://drive.google.com/uc?export=download&id=1O6QyM8DWiI7nUuxFqGTPLmPb0InfBIaV",
      "https://drive.google.com/uc?export=download&id=1x72FcjgSbSYnxkmm-hxNEPsoBPv9oS5a",
      "https://drive.google.com/uc?export=download&id=1ojdAjHPIFO83FrddFcTEL0UbfMKbUSCX",
      "https://drive.google.com/uc?export=download&id=1mTJk7eaSJhOvR7M3EoE6gS9kCpIxqUC7",
      "https://drive.google.com/uc?export=download&id=1RxI3YUo9IhXr4YzVRcAZCpfzOTWN3EUj",
      "https://drive.google.com/uc?export=download&id=11cuSHsHooeXg-amKcsdxLBBrbFLS-VTN",
      "https://drive.google.com/uc?export=download&id=1hZR8uXhqWE6QqVtwAAXtjI4u4vbm3TVh",
      "https://drive.google.com/uc?export=download&id=1Yud0fl8FQc1je-eqB9cyMH2bn1iVQgv-",
      "https://drive.google.com/uc?export=download&id=1mtfIAxj5mXjh0Q9yDl0f_1PoRRN9TKdl",
      "https://drive.google.com/uc?export=download&id=1LVApSdA4Rzde-1pRbaPpkXhiSGeoOHdO",
      "https://drive.google.com/uc?export=download&id=1HMO1Fjz0aAMUh_AFaVF3psXIUfO1Uadr",
      "https://drive.google.com/uc?export=download&id=1I7Xr0PHs8sm41M525ZdPBC6CQ3bWjN2u"
    ];

    if (songLinks.length === 0) {
      return api.sendMessage("❌ কোনো গান পাওয়া যায়নি!", threadID, messageID);
    }

    // ⏳ React for loading
    api.setMessageReaction("🎵", event.messageID, () => {}, true);

    // 🎲 Random song index (not same as last)
    let index;
    do {
      index = Math.floor(Math.random() * songLinks.length);
    } while (index === lastPlayed && songLinks.length > 1);
    lastPlayed = index;

    const url = songLinks[index];
    const filePath = `${__dirname}/cache/song_${index}.mp3`;

    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on("finish", async () => {
        api.sendMessage(
          {
            body: "🎶 Here's your random song 🎧",
            attachment: fs.createReadStream(filePath)
          },
          threadID,
          async () => {
            fs.unlinkSync(filePath);
          },
          messageID
        );
      });

      writer.on("error", (err) => {
        console.error("Error writing file:", err);
        api.sendMessage("❌ গান পাঠাতে সমস্যা হয়েছে!", threadID, messageID);
      });
    } catch (err) {
      console.error("Download error:", err);
      api.sendMessage("⚠️ গান ডাউনলোড করতে ব্যর্থ!", threadID, messageID);
    }
  }
};
