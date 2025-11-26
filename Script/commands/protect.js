const { getStreamFromURL, uploadImgbb } = global.utils;

module.exports = {
  config: {
    name: "protect",
    version: "1.0",
    author: "MOHAMMAD AKASH",
    countDown: 5,
    role: 0,
    shortDescription: "Lock everything in group",
    category: "box chat",
    guide: "{pn} on/off"
  },

  onStart: async function ({ message, event, args, threadsData }) {
    const { threadID } = event;

    if (!["on", "off"].includes(args[0]))
      return message.reply("Use: /protect on | /protect off");

    // ================================
    // PROTECT ON
    // ================================
    if (args[0] === "on") {
      const data = await threadsData.get(threadID);

      const save = {
        avatar: data.imageSrc || "REMOVE",
        name: data.threadName,
        nickname: data.members.map(u => ({ [u.userID]: u.nickname }))
          .reduce((a, b) => ({ ...a, ...b }), {}),
        theme: data.threadThemeID,
        emoji: data.emoji
      };

      await threadsData.set(threadID, save, "data.antiChangeInfoBox");

      return message.reply(
        "🛡 **PROTECT MODE ENABLED**\n" +
        "Avatar Locked\nName Locked\nNickname Locked\nTheme Locked\nEmoji Locked"
      );
    }

    // ================================
    // PROTECT OFF
    // ================================
    if (args[0] === "off") {
      await threadsData.set(threadID, {}, "data.antiChangeInfoBox");
      return message.reply("🔓 **PROTECT MODE DISABLED**\nAll locks removed!");
    }
  },

  // =======================================
  // EVENT HANDLER — AUTO RESTORE CHANGES
  // =======================================
  onEvent: async function ({ message, event, threadsData, role, api }) {
    const { threadID, logMessageType, logMessageData, author } = event;
    const dataAnti = await threadsData.get(threadID, "data.antiChangeInfoBox", {});
    if (!dataAnti) return;

    const botID = api.getCurrentUserID();

    // =====================
    // AVATAR PROTECT
    // =====================
    if (logMessageType === "log:thread-image" && dataAnti.avatar) {
      if (role < 1 && botID !== author) {
        if (dataAnti.avatar === "REMOVE") {
          message.reply("Avatar change is locked!");
          api.changeGroupImage("", threadID);
        } else {
          const img = await getStreamFromURL(dataAnti.avatar);
          message.reply("Avatar change is locked!");
          api.changeGroupImage(img, threadID);
        }
        return;
      }

      // Admin change
      const newImg = logMessageData.url;
      if (!newImg)
        await threadsData.set(threadID, "REMOVE", "data.antiChangeInfoBox.avatar");
      else {
        const up = await uploadImgbb(newImg);
        await threadsData.set(threadID, up.image.url, "data.antiChangeInfoBox.avatar");
      }
    }

    // =====================
    // NAME PROTECT
    // =====================
    if (logMessageType === "log:thread-name" && dataAnti.name) {
      if (role < 1 && botID !== author) {
        message.reply("Name locked!");
        api.setTitle(dataAnti.name, threadID);
        return;
      }

      await threadsData.set(threadID, logMessageData.name, "data.antiChangeInfoBox.name");
    }

    // =====================
    // NICKNAME PROTECT
    // =====================
    if (logMessageType === "log:user-nickname" && dataAnti.nickname) {
      const { participant_id, nickname } = logMessageData;
      if (role < 1 && botID !== author) {
        message.reply("Nickname locked!");
        api.changeNickname(
          dataAnti.nickname[participant_id],
          threadID,
          participant_id
        );
        return;
      }

      await threadsData.set(threadID, nickname, `data.antiChangeInfoBox.nickname.${participant_id}`);
    }

    // =====================
    // THEME PROTECT
    // =====================
    if (logMessageType === "log:thread-color" && dataAnti.theme) {
      if (role < 1 && botID !== author) {
        message.reply("Theme locked!");
        api.changeThreadColor(dataAnti.theme, threadID);
        return;
      }
      await threadsData.set(threadID, logMessageData.theme_id, "data.antiChangeInfoBox.theme");
    }

    // =====================
    // EMOJI PROTECT
    // =====================
    if (logMessageType === "log:thread-icon" && dataAnti.emoji) {
      if (role < 1 && botID !== author) {
        message.reply("Emoji locked!");
        api.changeThreadEmoji(dataAnti.emoji, threadID);
        return;
      }
      await threadsData.set(threadID, logMessageData.thread_icon, "data.antiChangeInfoBox.emoji");
    }
  }
};
