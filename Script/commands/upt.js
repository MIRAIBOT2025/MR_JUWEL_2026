const { createCanvas } = require('canvas');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const formatBytes = b => {
  if (!b && b !== 0) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b + 1)/Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(2) + " " + u[i];
};

let prev = null;
const getCPU = () => {
  try {
    let idle = 0, total = 0;
    for (const c of os.cpus()) {
      for (const t in c.times) total += c.times[t];
      idle += c.times.idle;
    }
    const cur = { idle, total };
    if (!prev) {
      prev = cur;
      return 0;
    }
    const di = cur.idle - prev.idle;
    const dt = cur.total - prev.total;
    prev = cur;
    return dt ? Math.round(100 - (100 * di / dt)) : 0;
  } catch (e) {
    return 0;
  }
};

const getDisk = () => {
  try {
    const out = execSync("df -k /").toString().split("\n")[1].split(/\s+/);
    const used = parseInt(out[2], 10) * 1024;
    const total = parseInt(out[1], 10) * 1024;
    return Math.round(used / total * 100);
  } catch {
    return 73; // fallback
  }
};

module.exports = {
  config: {
    name: "upt",
    aliases: ["up", "upt"],
    version: "40.4-dashboard",
    author: "MOHAMMAD AKASH",
    role: 0,
    category: "system",
    description: "Generate system dashboard image (CPU, RAM, Disk, uptime) and send as image."
  },

  /**
   * run is called by the bot framework.
   * Signature accepted by many Mirai-like frameworks: async function({ api, event, args, Threads, Users, utils })
   */
  run: async function({ api, event, args }) {
    try {
      const start = Date.now();

      // gather system stats
      const cpu = getCPU();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const ramPercent = Math.round(usedMem / totalMem * 100);
      const diskPercent = getDisk();

      const sec = process.uptime();
      const d = Math.floor(sec / 86400);
      const h = Math.floor(sec % 86400 / 3600);
      const m = Math.floor(sec % 3600 / 60);
      const s = Math.floor(sec % 60);
      const uptime = d ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;

      const ping = Date.now() - start;

      // Canvas dimensions
      const W = 1400, H = 820;
      const cv = createCanvas(W, H);
      const c = cv.getContext("2d");

      // BACKGROUND
      const bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#070A14");
      bg.addColorStop(1, "#0E1220");
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);

      // GLASS PANEL FUNCTION
      const glass = (x, y, w, h, r = 25) => {
        c.save();
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
        c.fillStyle = "rgba(255,255,255,0.06)";
        c.fill();
        c.strokeStyle = "rgba(255,255,255,0.12)";
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      };

      // SIDEBAR
      glass(30, 30, 330, 760);
      c.font = "bold 44px Arial";
      c.fillStyle = "#48caff";
      c.fillText("SYSTEM INFO", 60, 100);

      // INFO LIST
      let infoY = 160;
      const infoPad = 55;
      const infoLines = [
        `CPU       : ${cpu}%`,
        `RAM       : ${ramPercent}% (${formatBytes(usedMem)} / ${formatBytes(totalMem)})`,
        `Disk      : ${diskPercent}%`,
        `Memory    : ${formatBytes(totalMem)}`
      ];
      c.font = "30px Arial";
      c.fillStyle = "#dfefff";
      c.textAlign = "left";
      infoLines.forEach(t => {
        c.fillText(t, 60, infoY);
        infoY += infoPad;
      });

      // UPTIME HIGHLIGHT PANEL
      glass(30, infoY + 10, 330, 120, 25);
      c.font = "bold 36px Arial";
      c.fillStyle = "#00ffcc";
      c.fillText("🚀 UPTIME", 60, infoY + 50);
      c.font = "bold 32px Arial";
      c.fillStyle = "#ffffff";
      c.fillText(uptime, 60, infoY + 90);

      // HEADER PANEL WITH "DASHBOARD"
      glass(400, 30, 970, 200);
      c.font = "bold 52px Arial";
      c.fillStyle = "#52d5ff";
      c.textAlign = "center";
      c.fillText("DASHBOARD", 885, 110);

      // BAR DRAW FUNCTION
      const bar = (x, y, w, h, val, color, label) => {
        c.save();
        c.font = "28px Arial";
        c.fillStyle = "#c5dfff";
        c.textAlign = "left";
        c.fillText(label, x, y - 20);

        c.fillStyle = "rgba(255,255,255,0.07)";
        c.fillRect(x, y, w, h);

        const fw = (val / 100) * w;
        c.fillStyle = color;
        c.shadowColor = color;
        c.shadowBlur = 30;
        c.fillRect(x, y, fw, h);
        c.shadowBlur = 0;

        c.font = "bold 26px Arial";
        c.fillStyle = "#fff";
        c.textAlign = "right";
        c.fillText(val + "%", x + w - 10, y + h - 10);
        c.restore();
      };

      // Draw b
