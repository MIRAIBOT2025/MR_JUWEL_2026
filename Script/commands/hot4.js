module.exports.config = {
  name: "hot4",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "MOHAMMAD AKASH",
  description: "Random 18+ hot video 😈",
  commandCategory: "18+",
  usages: "hot2",
  cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
  const axios = require("axios");
  const fs = require("fs-extra");
  const { threadID, messageID } = event;

  const videos = [
    "https://drive.google.com/uc?export=download&id=1hifnUhP2h6CvozIfGi7wHgM5ayrPoIXa",
    "https://drive.google.com/uc?export=download&id=1PS9hWE-f_sNmBgtdniQhVmtj-ByDVk5x",
    "https://drive.google.com/uc?export=download&id=1ggG47048qmqrZpgCN1ZV7jkjL8eI0n1A",
    "https://drive.google.com/uc?export=download&id=1zEuq1V1o5fgqpHbBfELEA22feV4NYsVI",
    "https://drive.google.com/uc?export=download&id=1a1dg4FcvJNQJIT8BwbxrdEbN7dBgC0s3",
    "https://drive.google.com/uc?export=download&id=1Fupdugkm2vLluKiiMtMLsiQmxnMXTMHq",
    "https://drive.google.com/uc?export=download&id=1CrI71iIILF6VlpBuNFjoKVGoxIw-ox7K",
    "https://drive.google.com/uc?export=download&id=1OKvjCIcEL39iHZGc7KnbJfZ6K5_B9HAT",
    "https://drive.google.com/uc?export=download&id=1ZBLYszC62I0cP20Ml8Ro0cuWgJH0Eigy",
    "https://drive.google.com/uc?export=download&id=177Plq4pVxQQi-XHPmQsmipANG7_wZiTL",
    "https://drive.google.com/uc?export=download&id=1n5I4Hwwz_jEP6I_2k7E9rIlso11Gu527",
    "https://drive.google.com/uc?export=download&id=1L3A18MO6M2fPox5aCCQuNROCvOl38br8",
    "https://drive.google.com/uc?export=download&id=1axgftswNPMYlHbMDe_ZY4AIfpqtztlUq",
    "https://drive.google.com/uc?export=download&id=1jWLrJ0hWQB1BEW2eGGJehYZ794Fhv99b",
    "https://drive.google.com/uc?export=download&id=1Le3bFXrmb6kiTyx2nxXGPThUEamOBVsm",
    "https://drive.google.com/uc?export=download&id=1DHq9BT7h2sgjj6eB06oq_qWDtSfkDlER",
    "https://drive.google.com/uc?export=download&id=1IkApBqhFEkXIX8p5T3XrhfF6-RQHOSHC",
    "https://drive.google.com/uc?export=download&id=1blfIGuqdSa80SZtz1SBug_gvM8TGK4oZ",
    "https://drive.google.com/uc?export=download&id=1daMM5cWNWnhquV-gRNKIizvrZz-xEeC1",
    "https://drive.google.com/uc?export=download&id=1irSxVAI6PXw3S5QDDQuiyF0OAUGiYjKn"
  ];

  const randomVideo = videos[Math.floor(Math.random() * videos.length)];
  const path = __dirname + "/cache/hot2_video.mp4";

  try {
    api.sendMessage("🔥 লোড হচ্ছে জুয়েল জানু... একদম গরম মাল আসতেছে 🥵", threadID, messageID);

    const response = await axios({
      url: randomVideo,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(path);
    response.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage({
        body: `hot4__🔥 এই নেও জানু, একদম ফ্রেশ গরম মাল 😈\nদেখলেই বের হয়ে যাবে 🫦`,
        attachment: fs.createReadStream(path)
      }, threadID, () => fs.unlinkSync(path), messageID);
    });

    writer.on("error", () => {
      api.sendMessage("❌ ভিডিও ডাউনলোডে সমস্যা হয়েছে।", threadID, messageID);
    });

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ কিছু একটা গন্ডগোল হয়েছে, আবার চেষ্টা করো!", threadID, messageID);
  }
};
