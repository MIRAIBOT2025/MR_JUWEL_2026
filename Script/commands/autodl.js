const axios = require("axios");
const fs = require("fs-extra");
const { alldown } = require("shaon-videos-downloader");

module.exports = {
  config: {
    name: "autodl",
    version: "0.0.4",
    hasPermission: 0,
    credits: "SHAON",
    description: "Auto Video Downloader",
    commandCategory: "auto",
    usages: "",
    cooldowns: 3,
  },

  run: async function () {},

  handleEvent: async function ({ api, event }) {
    try {
      const content = event.body ? event.body.toLowerCase() : "";
      if (!content.startsWith("https://")) return;

      api.setMessageReaction("⚡", event.messageID, () => {}, true);

      const data = await alldown(event.body);
      if (!data || !data.url) {
        return api.sendMessage("❌ এই লিঙ্ক থেকে ভিডিও নামানো সম্ভব না!", event.threadID);
      }

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const video = (await axios.get(data.url, { responseType: "arraybuffer" })).data;
      const filePath = __dirname + "/cache/auto.mp4";
      fs.writeFileSync(filePath, video);

      return api.sendMessage({
        body: `┏━━━━ 🎬━━━━┓
⎯꯭𓆩꯭𝆺𝅥😻⃞𝐌⃞𝆠፝֟𝐑᭄ღ倫 𝐉⃞𝐔⃞𝐖⃞𝐄⃞𝐋༢࿐
┗━━━━ ⚡ ━━━━━━┛

🎞 আপনার ভিডিও রেডি ✔
📥 Auto Download Complete 🎯
✨ Enjoy The Video ✨

🔥 𝐓𝐡𝐚𝐧𝐤𝐬 𝐅𝐨𝐫 𝐔𝐬𝐢𝐧𝐠 𝐌𝐲 𝐁𝐨𝐭 🔥`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

    } catch (err) {
      console.log(err);
      api.sendMessage("⚠️ কিছু সমস্যা হয়েছে! আবার চেষ্টা করুন।", event.threadID, event.messageID);
    }
  }
};
