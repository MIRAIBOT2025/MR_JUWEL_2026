const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Readable } = require("stream");

// ==================== ডেটা ====================
const prayerTimes = {
  Fajr: "5:35 AM",
  Dhuhr: "1:30 PM",
  Asr: "4:00 PM",
  Maghrib: "5:30 PM",
  Isha: "7:45 PM"
};

const dailyDua = [
  "হে আল্লাহ! আমাকে সঠিক পথে পরিচালিত কর এবং আমার অন্তরকে ঈমানের আলোয় ভরিয়ে দাও।",
  "হে আল্লাহ! আমাকে পাপ থেকে দূরে রাখ, যেমন পূর্ব ও পশ্চিম একে অপর থেকে দূরে।"
];

const dailyHadith = [
  "রাসুল ﷺ বলেছেন: 'যে ব্যক্তি একটি ভাল কাজের দিকনির্দেশ করে, সে সেই কাজের সমান সওয়াব পাবে।' (মুসলিম)",
  "রাসুল ﷺ বলেছেন: 'তোমাদের মধ্যে উত্তম সেই ব্যক্তি, যে কুরআন শেখে ও অন্যকে শেখায়।' (বুখারী)"
];

const islamicQuotes = [
  "সর্বোত্তম সম্পদ হলো সন্তুষ্টি। – হযরত আলী (রাঃ)",
  "যে আল্লাহর উপর ভরসা করে, আল্লাহ তার জন্য যথেষ্ট। – সূরা আত-তালাক ৬৫:৩",
  "দুনিয়া মুমিনের কারাগার ও কাফেরের জান্নাত। – মুসলিম",
  "আল্লাহ সেই জাতির অবস্থা পরিবর্তন করেন না, যতক্ষণ না তারা নিজেরা নিজেদের পরিবর্তন করে। – সূরা আর-রাদ ১৩:১১"
];

const ramadanMessage = [
  "রমজান মুবারক! আল্লাহর রহমত, মাগফিরাত ও নাজাতের শ্রেষ্ঠ মাসে বেশি বেশি ইবাদত করো।",
  "রোজা শুধু ক্ষুধা-তৃষ্ণা নয়, বরং আত্মার পরিশুদ্ধি ও আল্লাহর নিকটে যাওয়ার মাধ্যম।"
];

const goodNightMsg = [
  "শুভ রাত্রি! ঘুমানোর আগে আল্লাহকে স্মরণ করুন, ক্ষমা চেয়ে নিদ্রা নিন।",
  "রাসুল ﷺ বলেছেন: ‘যে ব্যক্তি ঘুমানোর আগে সূরা ইখলাস, ফালাক ও নাস তিনবার পাঠ করবে, সে আল্লাহর হেফাজতে থাকবে।’"
];

const defaultAdhan = "https://i.imgur.com/95GRyZE.mp4";

// ==================== হেল্পার ====================
function getCurrentTimeInDhaka() {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
}

function getHijriDate(date) {
  try {
    return new Intl.DateTimeFormat('bn-BD-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  } catch {
    return "হিজরী তারিখ";
  }
}

function parsePrayerTime(time) {
  const [t, period] = time.split(' ');
  let [h, m] = t.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

async function getAudioStream(url) {
  try {
    const res = await axios({ method: "GET", url, responseType: "arraybuffer" });
    return Readable.from(Buffer.from(res.data));
  } catch {
    return null;
  }
}

// ==================== প্রিমিয়াম ফ্রেম ====================
const prayerReminderFrame = (name, time) => `
╔═══════ 🕌 ═══════╗
   ⏰*${name} নামাজের সময়* 
╠═════════════════╣
⏰ *সময়:* ${time}
📍 *নিকটস্থ মসজিদে আদায় করুন*
🤲 *আল্লাহর সন্তুষ্টির জন্য নামাজ কায়েম করুন*
╚═══════ 🕌 ═══════╝
— 𝗠𝗥 𝗝𝗨𝗪𝗘𝗟
`;

const dailyIslamicFrame = (dua, hadith, quote) => `
╔═══  আজকের বার্তা ═══╗
📌 *দোয়া:*  
${dua}

📌 *হাদিস:*  
${hadith}

📌 *ইসলামিক উক্তি:*  
${quote}
╚═════════════════╝
— 𝗠𝗥 𝗝𝗨𝗪𝗘𝗟
`;

const goodNightFrame = (msg) => `
╔═════  শুভ রাত্রি  ═════╗
${msg}
╚═════════════════╝
— 𝗠𝗥 𝗝𝗨𝗪𝗘𝗟
`;

const sleepReminderFrame = () => `
╔══ 💫 ঘুমের রিমাইন্ডার ══╗
    রাত ১০টা বাজে🙂
    সবাই ঘুমিয়ে যাও🥰… 
 
ঘুমানোর আগে আল্লাহকে স্মরণ করুন 🤲  🥰🛏 শান্তি ও স্বপ্নময়    ঘুম কামনা করো
╚═════════════════╝
— 𝗠𝗥 𝗝𝗨𝗪𝗘𝗟
`;

const ramadanFrame = (msg) => `
╔═══ রমজান মোবারক═══╗
${msg}
🌟 বেশি ইবাদত করুন, আল্লাহর রহমত লাভ করুন  
╚═════════════════╝
— 𝗠𝗥 𝗝𝗨𝗪𝗘𝗟
`;

// ==================== Module Config ====================
module.exports.config = {
  name: "autotime",
  version: "3.3.3",
  permission: 0,
  credits: "MR JUWEL",
  description: "Islamic Time Alert (Premium Frames Added)",
  prefix: true,
  commandCategory: "user",
  cooldowns: 5
};

// ==================== onLoad ====================
module.exports.onLoad = ({ api }) => {
  if (global.autotimeInterval) clearInterval(global.autotimeInterval);

  const sent = new Set();

  global.autotimeInterval = setInterval(async () => {
    try {
      const nowStr = getCurrentTimeInDhaka();
      const now = new Date(nowStr);
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentMinutes = hour * 60 + minute;
      const hijri = getHijriDate(now);

      // 📌 5:10 — Daily Islamic Message
      if (hour === 5 && minute === 10 && !sent.has("daily")) {
        sent.add("daily");
        const msg = dailyIslamicFrame(
          dailyDua[Math.floor(Math.random() * dailyDua.length)],
          dailyHadith[Math.floor(Math.random() * dailyHadith.length)],
          islamicQuotes[Math.floor(Math.random() * islamicQuotes.length)]
        );
        for (const t of global.data.allThreadID) api.sendMessage(msg, t);
      }

      // 📌 Ramadan Alert
      if ((hijri.includes("রমজান") || hijri.includes("Ramadan")) && hour === 4 && minute === 10) {
        const msg = ramadanFrame(ramadanMessage[Math.floor(Math.random() * ramadanMessage.length)]);
        for (const t of global.data.allThreadID) api.sendMessage(msg, t);
      }

      // 📌 10:00 PM — Sleep Reminder
      if (hour === 22 && minute === 0 && !sent.has("sleepReminder")) {
        sent.add("sleepReminder");
        for (const t of global.data.allThreadID)
          api.sendMessage(sleepReminderFrame(), t);
      }

      // 📌 10:05 PM — Good Night
      if (hour === 22 && minute === 5 && !sent.has("night")) {
        sent.add("night");
        for (const t of global.data.allThreadID)
          api.sendMessage(goodNightFrame(goodNightMsg[Math.floor(Math.random() * goodNightMsg.length)]), t);
      }

      // 📌 Prayer Reminder + Adhan
      for (const [name, time] of Object.entries(prayerTimes)) {
        const tMin = parsePrayerTime(time);
        if (Math.abs(tMin - currentMinutes) === 10 && !sent.has(name)) {
          sent.add(name);
          const audio = await getAudioStream(defaultAdhan);
          const body = prayerReminderFrame(name, time);

          for (const t of global.data.allThreadID) {
            api.sendMessage(
              audio ? { body, attachment: audio } : body,
              t
            );
          }
        }
      }

      // Reset
      if (hour === 0 && minute === 1) sent.clear();

    } catch (e) {}
  }, 60 * 1000);
};

module.exports.run = () => "Autotime Pro Premium Frames Updated ✔️";
