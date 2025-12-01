handleEvent: async function ({ api, event }) {
  const axios = require("axios");
  const fs = require("fs-extra");
  const request = require("request");
  const { alldown } = require("shaon-videos-downloader");

  const content = (event.body || "").trim();
  
  if (!content.startsWith("http://") && !content.startsWith("https://")) return;
  if (event.senderID === api.getCurrentUserID()) return;

  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  const processingMsg = await api.sendMessage("🔄 তোমার ভিডিও প্রসেসিং করা হচ্ছে দয়া করে অপেক্ষা করুন⊰𝚓𝚞𝚠𝚎𝚕", event.threadID);

  try {
    const result = await alldown(content);

    let videoUrl = result.url || result.hd || result.sd || result.result || 
                   (result.data && result.data.url) || (result.data && result.data.hd);

    if (!videoUrl) throw new Error("No video URL found");

    const fileName = `auto_${Date.now()}.mp4`;
    const filePath = __dirname + `/cache/${fileName}`;

    await new Promise((resolve, reject) => {
      request(videoUrl)
        .pipe(fs.createWriteStream(filePath))
        .on("finish", resolve)
        .on("error", (err) => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        });
    });

    api.unsendMessage(processingMsg.messageID);
    api.setMessageReaction("✅", event.messageID, () => {}, true);

    await api.sendMessage({
      body: `༆⃟🌺⃟༓𝐀𝐮𝐭𝐨 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐞𝐫༓⃟🌺⃟༆
╭───────────────╮
├ 🌸 ✿ ভিডিও ডাউনলোড সম্পন্ন ✿
├ 💫 সোর্সঃ অটো ডিটেক্টেড
├ ⏳ সময়ঃ ${new Date().toLocaleString('bn-BD')}
╰───────────────╯

╭─❍
│ 
│─⪼⎯꯭𓆩꯭𝆺𝅥😻⃞𝐌⃞𝆠፝֟𝐑᭄ღ倫 𝐉⃞𝐔⃞𝐖⃞𝐄⃞𝐋༢࿐
╰───────────𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹𐌹`,
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      fs.unlinkSync(filePath);
    }, event.messageID);

  } catch (error) {
    api.unsendMessage(processingMsg.messageID);
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    api.sendMessage("❌ ভিডিও ডাউনলোড করতে সমস্যা হয়েছে!\নলিংকটি সাপোর্টেড নয় অথবা ত্রুটি রয়েছে।", event.threadID);
  }
    }
