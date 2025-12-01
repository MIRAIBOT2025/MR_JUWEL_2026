const fs = require("fs-extra");

module.exports.config = {
  name: "birthdayAuto",
  version: "1.1.1",
  hasPermssion: 2,
  credits: "mr Juwel",
  description: "Auto message 12 days before birthday and on the birthday",
  commandCategory: "system",
  cooldowns: 5
};

module.exports.run = async function ({ api }) {
  try {
    const threads = await api.getThreadList(100, null, ["INBOX"]);
    if (!threads || threads.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();

    const birthDay = 24; // দিন
    const birthMonth = 4; // এপ্রিল → 4
    const birthYear = 2004; // জন্ম সাল

    let birthday = new Date(currentYear, birthMonth, birthDay);

    if (now > birthday) {
      birthday = new Date(currentYear + 1, birthMonth, birthDay);
    }

    const diffDays = Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
    const link = "fb.com/mrjuwel2025";

    let message = "";

    if (diffDays >= 1 && diffDays <= 12) {
      message =
        `📢 𝑴𝑹 𝑱𝑼𝑾𝑬𝑳 এর জন্মদিন আসতে আর বাকি *${diffDays} দিন*!\n` +
        `🎁 উইশ করার জন্য রেডি থাকেন! 🥳\n${fb.com/mrjuwel2025}`;
    }
    else if (diffDays === 0) {
      message =
        `🎉 আজ 𝑴𝑹 𝑱𝑼𝑾𝑬𝑳 এর জন্মদিন! 🎂\n\n` +
        `🎂ღ𝑯𝒂𝒑𝒑𝒚 𝑩𝒊𝒓𝒕𝒉𝒅𝒂𝒚\n` +
        `𝑻𝒐𝒐 𝒀𝒐𝒖 𝑱𝒖𝒘𝒆𝒍🥳\n\n` +
        `জন্মদিনের শুভেচ্ছা ও ভালোবাসা রইলো❤᭄\n` +
        `“-༎আজকের༎এই༎দিন༎༎🍂🥀༊༅তোমার༅জন্য༅অনেক💞!!🤗༊༅\n` +
        `সুখময়༎নতুন༎এক༅প্রভাত༎🥰🥀🖤༎\n` +
        `আজকের༎এইদিন༎তোমার༅জন্য༎হোক༎কষ্টহীন🦋🤗💞༊༅\n` +
        `আজকের༎এই༅সময়টা༅༎🌺🍁😽༎শুধু༎তোমার༎জন্য༎😽🌈\n` +
        `তোমার༎জন্য༎আজ༎পৃথিবীটা༎হয়ে যাক༎রঙিন🌈🤗\n\n` +
        `আমারツ এর পক্ষ থেকে༆ツ\n` +
        `🎊𝐇𝐀𝐏𝐏𝐘 𝐁𝐈𝐑𝐓𝐇𝐃𝐀𝐘 🎉\n\n` +
        `'愛✮⃝⟨🅒🄴🅞⟩✮⃝愛\n` +
        `╔━━━♛🎀♛━━━╗\n` +
        `ᯓ✮⃝𝗝𝗨🆆𝗘𝗟࿐\n` +
        `💚ღ𝑴𝒂𝒏𝒚 𝑴𝒂𝒏𝒚 𝑯𝒂𝒑𝒑𝒚 𝑹𝒆𝒕𝒖𝒓𝒏 𝑶𝒇𝒇 𝑻𝒉𝒆 𝑫𝒂𝒚 𝑱𝒖𝒘𝒆𝒍ღ`;
    }
    else {
      return;
    }

    await Promise.all(
      threads.map(thread => api.sendMessage(message, thread.threadID))
    );

  } catch (error) {
    console.error("Birthday auto error:", error);
  }
};
