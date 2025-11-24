const fs = require('fs');
const path = __dirname + '/antigaliStatus.json';

let offenseTracker = {}; // threadID -> userID -> { count, uidSaved }
const badWords = [
  "fuck", "fucking", "motherfucker", "mother fucker", "mf","fucker", "bitch", "bitch", "slut", "whore", "asshole", "bastard", "dick", "chdi","retard", "pussy", "cunt","gay", "lesbian", "xodi", "nigga", "nigger", "cock", "jerk", "wanker", "porn", "sucker", "bollocks", "bloodyhell", "xoda", "bullshit", "voda", "douche", "douchebag", "moron","hada", "scumbag", "Head", "prick", "fag", "faggot", "মাদারচোদ", "চুদি", "মাগি", "কার বাল", "তোমার বাল", " তোর বাল", "চোকাচোদা", "চুদবো", "চুদানির পোলা", "মাং", "সাউয়া", "তোর সাউয়া", "মাংগের বেডি", "মাংগের গুপ", "বালের গুপ", "গিটার বাজাও", "জাও গিটার বাজাও", "হাত মারবে", "হাত মারবো", "হাত মারো", "হাত মাড়ি", "হাত মারতে জাবে", "গিটার বাজাবো", "পুটকি", "রেন্ডির ছেলে", "রেন্ডি মেয়ে", "রেন্ডি", "এডমিন এর বাল","সাউয়ার গুপ", "মাংগের গুপ", "আবাল নাকি", "তুই আবাল নাকি", "তুমি আবাল নাকি", "না তুই আবাল"
];

// 🔹 স্ট্যাটাস লোড
function loadStatus() {
  if (!fs.existsSync(path)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return data.status || false;
  } catch {
    return false;
  }
}

// 🔹 স্ট্যাটাস সেভ
function saveStatus(status) {
  fs.writeFileSync(path, JSON.stringify({ status }), 'utf-8');
}

// রানটাইমে স্ট্যাটাস লোড
let antiGaliStatus = loadStatus();

module.exports.config = {
  name: "antigali",
  version: "3.4.0",
  hasPermssion: 0,
  credits: "বাংলা ভার্সন: MR JUWEL & Rx Abdullah",
  description: "বাংলা Anti-Gali সিস্টেম (সতর্কবার্তা + কিক)",
  commandCategory: "moderation",
  usages: "!antigali on / !antigali off",
  cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event, Threads }) {
  try {
    if (!antiGaliStatus || !event.body) return;

    const message = event.body.toLowerCase();
    const threadID = event.threadID;
    const userID = event.senderID;
    const botID = api.getCurrentUserID && api.getCurrentUserID();

    if (!offenseTracker[threadID]) offenseTracker[threadID] = {};
    if (!offenseTracker[threadID][userID]) offenseTracker[threadID][userID] = { count: 0, uidSaved: userID };

    if (!badWords.some(word => message.includes(word))) return;

    let userData = offenseTracker[threadID][userID];
    userData.count += 1;
    const count = userData.count;

    // ব্যবহারকারীর নাম বের করা
    let userInfo = {};
    try {
      userInfo = await api.getUserInfo(userID);
    } catch {}
    const userName = userInfo[userID]?.name || "অজানা ব্যবহারকারী";

    // থ্রেড ইনফো (অ্যাডমিন চেক)
    let threadInfo = {};
    try {
      if (Threads && typeof Threads.getData === "function") {
        const tdata = await Threads.getData(threadID);
        threadInfo = tdata.threadInfo || {};
      } else if (typeof api.getThreadInfo === "function") {
        threadInfo = await api.getThreadInfo(threadID) || {};
      }
    } catch {}

    const isAdminInThread = (uid) => {
      try {
        if (!threadInfo || !threadInfo.adminIDs) return false;
        return threadInfo.adminIDs.some(item => {
          if (typeof item === "string") return item == String(uid);
          if (item && item.id) return String(item.id) == String(uid);
          return false;
        });
      } catch {
        return false;
      }
    };

    // 🔰 বাংলা সতর্কবার্তা ফ্রেম
    const frameBase = (n, extra = '') => (
      `╔════════════════════════════════════╗
🚫 সতর্কবার্তা #${n}
👤 ব্যবহারকারী: ${userName} (UID: ${userID})
⚠️ আপনার মেসেজে অশালীন শব্দ পাওয়া গেছে।
🔁 অপরাধের সংখ্যা: ${n} বার
${extra}
╚════════════════════════════════════╝`
    );

    if (count === 1) {
      const msg = frameBase(1, '📢 দয়া করে এখনই মেসেজটি আনসেন্ড করুন!');
      await api.sendMessage(msg, threadID, event.messageID);
    } else if (count === 2) {
      const msg = frameBase(2, '⚠️ পরেরবার একই ভুল করলে আপনাকে রিমুভ করা হবে!');
      await api.sendMessage(msg, threadID, event.messageID);
    }

    if (event.messageID) {
      setTimeout(() => {
        api.unsendMessage(event.messageID).catch(() => {});
      }, 60000);
    }

    if (count === 3) {
      const botIsAdmin = botID ? isAdminInThread(botID) : false;

      if (!botIsAdmin) {
        userData.count = 2;
        return api.sendMessage(
          `╔════════════════════════════════════╗
⚠️ কাজটি বন্ধ করা হয়েছে
🤖 আমি (বট) অ্যাডমিন নই, তাই কাউকে রিমুভ করতে পারছি না।
অনুগ্রহ করে বটকে অ্যাডমিন করুন অথবা
গ্রুপের কোনো অ্যাডমিন ব্যবহারকারীকে রিমুভ করুন।
👤 ব্যবহারকারী: ${userName} (UID: ${userID})
╚════════════════════════════════════╝`,
          threadID
        );
      }

      if (isAdminInThread(userID)) {
        userData.count = 2;
        return api.sendMessage(
          `╔════════════════════════════════════╗
⚠️ কাজটি বন্ধ করা হয়েছে
এই ব্যবহারকারী একজন গ্রুপ অ্যাডমিন, তাই বট তাকে সরাতে পারবে না।
যদি প্রয়োজন মনে করেন, গ্রুপের অন্য অ্যাডমিনরা তাকে ম্যানুয়ালি রিমুভ করতে পারেন।
👤 ব্যবহারকারী: ${userName} (UID: ${userID})
╚════════════════════════════════════╝`,
          threadID
        );
      }

      try {
        await api.removeUserFromGroup(userID, threadID);
        userData.count = 0;
        return api.sendMessage(
          `🚨 ব্যবহারকারী ${userName} (UID: ${userID})
বারবার অশালীন শব্দ ব্যবহারের কারণে
গ্রুপ থেকে সরিয়ে দেওয়া হয়েছে।`,
          threadID
        );
      } catch {
        userData.count = 2;
        return api.sendMessage(`⚠️ ${userName} (${userID})-কে কিক করতে ব্যর্থ। বটের পারমিশন চেক করুন।`, threadID);
      }
    }

  } catch (error) {
    console.error("AntiGali error:", error);
    api.sendMessage("⚠️ Anti-Gali সিস্টেমে একটি ত্রুটি ঘটেছে।", event.threadID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  try {
    if (args[0] === "on") {
      antiGaliStatus = true;
      saveStatus(true);
      return api.sendMessage("🟢 Anti-Gali সিস্টেম চালু হয়েছে ✅", event.threadID);
    } else if (args[0] === "off") {
      antiGaliStatus = false;
      saveStatus(false);
      return api.sendMessage("🔴 Anti-Gali সিস্টেম বন্ধ করা হয়েছে ❌", event.threadID);
    } else {
      return api.sendMessage("📘 ব্যবহার: !antigali on / !antigali off", event.threadID);
    }
  } catch (err) {
    console.error("Run command error:", err);
    api.sendMessage("⚠️ Anti-Gali কমান্ড চালাতে সমস্যা হয়েছে।", event.threadID);
  }
};
