const fs = require("fs");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname); // commands ফোল্ডার

function listCommands() {
  const files = fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith(".js") && f !== path.basename(__filename))
    .map(f => f.replace(/\.js$/, ""));
  return files;
}

module.exports.config = {
  name: "menu",
  version: "1.2.0",
  hasPermssion: 2, // অ্যাডমিন/মডের জন্য
  credits: "MR JUWEL + ChatGPT",
  description: "বট কন্ট্রোল সেন্টার (মেনু)",
  commandCategory: "system",
  usages: "menu",
  cooldowns: 2
};

const T = {
  title: "🔧 মেনু • কন্ট্রোল সেন্টার",
  ask: "আপনার পছন্দের অপশনের নম্বর লিখুন:",
  opts: [
    "বর্তমান স্ট্যাটাস দেখাও",
    "কমান্ড চালু/বন্ধ করুন",
    "কমান্ড ফাইল ডিলিট করুন (সেফ মোড)",
    "এই চ্যাটে BOT বন্ধ করুন (BAN)",
    "এই চ্যাটে BOT চালু করুন (UNBAN)",
    "বট রিস্টার্ট করুন"
  ],
  cancel: "❌ বাতিল করা হলো।",
  confirmDel: (name)=>`আপনি কি নিশ্চিত যে “${name}.js” ডিলিট করতে চান? (yes/no)`,
  notFound: "কমান্ড পাওয়া যায়নি।"
};

module.exports.run = async function({ api, event, Threads }) {
  const data = (await Threads.getData(event.threadID)).data || {};
  const statusLines = [
    `• এই চ্যাট: ${data.banned ? "🚫 BOT বন্ধ" : "🟢 BOT চালু"}`
  ];

  const menu =
`${T.title}
${statusLines.join("\n")}

1) ${T.opts[0]}
2) ${T.opts[1]}
3) ${T.opts[2]}
4) ${T.opts[3]}
5) ${T.opts[4]}
6) ${T.opts[5]}

${T.ask}`;

  return api.sendMessage(menu, event.threadID, (err, info) => {
    if (err) return;
    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      author: event.senderID,
      type: "menu"
    });
  });
};

module.exports.handleReply = async function (o) {
  const { api, event, handleReply, Threads } = o;
  if (event.senderID != handleReply.author) return;

  const reply = (msg, cb) => api.sendMessage(msg, event.threadID, cb);

  if (handleReply.type === "menu") {
    const choice = (event.body || "").trim();

    switch (choice) {
      case "1": {
        const cmds = listCommands();
        const lines = cmds.slice(0, 40).map(n => `• ${n}`);
        const data = (await Threads.getData(event.threadID)).data || {};
        return reply(`📊 স্ট্যাটাস:\n- চ্যাট: ${data.banned ? "🚫 BOT বন্ধ" : "🟢 BOT চালু"}\n\n🧩 কমান্ড (${lines.length} টি দেখানো হয়েছে):\n${lines.join("\n")}`);
      }

      case "2": {
        const list = listCommands();
        if (list.length === 0) return reply("কোনো কমান্ড পাওয়া যায়নি।");
        const menu = list.map((n,i)=>`${i+1}) ${n}`).join("\n");
        return reply(`🔁 কোন কমান্ড চালু/বন্ধ করতে চান তা নির্বাচন করুন (ডাটাবেস সংযুক্ত নয়, শুধুমাত্র উদাহরণ):\n${menu}\n\n${T.ask}`);
      }

      case "3": {
        const list = listCommands();
        if (list.length === 0) return reply("কোনো কমান্ড পাওয়া যায়নি।");
        const menu = list.map((n,i)=>`${i+1}) ${n}`).join("\n");
        return reply(`🗑️ কোন কমান্ড ফাইল ডিলিট করতে চান তা নির্বাচন করুন:\n${menu}\n\n${T.ask}`, (err, info) => {
          if (err) return;
          global.client.handleReply.push({
            name: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            type: "deletePick",
            cmds: list
          });
        });
      }

      case "4": { // ✅ BAN
        const data = (await Threads.getData(event.threadID)).data || {};
        data.banned = 1;
        data.banReason = "মেনু থেকে BAN করা হয়েছে";
        await Threads.setData(event.threadID, { data });
        global.data.threadBanned.set(parseInt(event.threadID), 1);
        return reply("🚫 BOT এখন এই চ্যাটে বন্ধ।");
      }

      case "5": { // ✅ UNBAN
        const data = (await Threads.getData(event.threadID)).data || {};
        data.banned = 0;
        delete data.banReason;
        await Threads.setData(event.threadID, { data });
        global.data.threadBanned.delete(parseInt(event.threadID));
        return reply("🟢 BOT এখন এই চ্যাটে চালু।");
      }

      case "6": { // ♻️ Restart
        reply("♻️ বট রিস্টার্ট হচ্ছে...", () => setTimeout(()=>process.exit(1), 500));
        return;
      }

      default:
        return reply(T.cancel);
    }
  }

  if (handleReply.type === "deletePick") {
    const idx = parseInt((event.body||"").trim(), 10) - 1;
    const list = handleReply.cmds || [];
    if (!(idx >=0 && idx < list.length)) return api.sendMessage("ভুল নম্বর!", event.threadID);
    const name = list[idx];

    return api.sendMessage(T.confirmDel(name), event.threadID, (err, info) => {
      if (err) return;
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID,
        type: "confirmDelete",
        cmdName: name
      });
    });
  }

  if (handleReply.type === "confirmDelete") {
    const ans = (event.body||"").trim().toLowerCase();
    const name = handleReply.cmdName;
    if (!["yes","y","no","n"].includes(ans)) {
      return api.sendMessage("দয়া করে yes বা no লিখুন।", event.threadID);
    }
    if (ans.startsWith("n")) return api.sendMessage(T.cancel, event.threadID);

    const safeName = name.replace(/[^a-z0-9_\-]/gi, "");
    const target = path.join(COMMANDS_DIR, `${safeName}.js`);
    if (!fs.existsSync(target)) return api.sendMessage(T.notFound, event.threadID);

    try {
      fs.unlinkSync(target);
      return api.sendMessage(`🗑️ ডিলিট করা হয়েছে: ${safeName}.js`, event.threadID);
    } catch (e) {
      return api.sendMessage(`❌ ডিলিট ব্যর্থ: ${e.message}`, event.threadID);
    }
  }
};
