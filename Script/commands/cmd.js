/**
 * mirai_cmd_manager.js
 *
 * Mirai-style command manager (load / loadAll / unload / install)
 * init(bot, options) দিয়ে রেজিস্টার করো
 *
 * NOTE:
 * - যদি তোমার Mirai API method নাম ভিন্ন হয় (sendMessage / reply / onMessage),
 *   নিচের sendReply ফাংসনটি তোমার API অনুযায়ী পরিবর্তন করে নিচে ব্যবহার করুন।
 */

const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

function getDomain(url) {
	const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;
	const match = url.match(regex);
	return match ? match[1] : null;
}

function isURL(str) {
	try {
		new URL(str);
		return true;
	}
	catch (e) {
		return false;
	}
}

// ----- helper to send reply (adapt to your Mirai API) -----
async function sendReply(bot, event, text) {
	// Mirai.js might expect: bot.sendMessage({ target: event.sender.id, messageChain: [...] })
	// or event.reply(text). Adjust below to your bot.
	try {
		if (typeof event.reply === "function") {
			await event.reply(text);
			return;
		}
		// generic fallback: if bot has sendMessage
		if (bot && typeof bot.sendMessage === "function") {
			await bot.sendMessage(event.sender?.id || event.userId || event.senderId, text);
			return;
		}
		// else try console
		console.log("[reply]", text);
	} catch (e) {
		console.error("Failed to send reply:", e);
	}
}

// ----- load/unload logic (kept similar to original) -----
const packageAlready = [];
const spinner = "\\|/-";
let count = 0;

function removeHomeDir(str) {
	// minimal remove cwd to avoid absolute paths in messages (original utils.removeHomeDir)
	if (!str) return str;
	return str.replace(process.cwd(), "");
}

function loadScripts(folder, fileName, log = console, configCommands = {}, rawCode) {
	try {
		if (rawCode) {
			// rawCode expected to be full JS code string and fileName includes .js
			const nameOnly = fileName.slice(0, -3);
			fs.ensureDirSync(path.normalize(`${process.cwd()}/scripts/${folder}`));
			fs.writeFileSync(path.normalize(`${process.cwd()}/scripts/${folder}/${nameOnly}.js`), rawCode);
			fileName = nameOnly;
		}

		const pathCommand = path.normalize(process.cwd() + `/scripts/${folder}/${fileName}.js`);
		if (!fs.existsSync(pathCommand)) {
			const err = new Error(`File not found: ${fileName}.js`);
			err.name = "FileNotFound";
			throw err;
		}

		const contentFile = fs.readFileSync(pathCommand, "utf8");
		const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
		let allPackage = contentFile.match(regExpCheckPackage);
		if (allPackage) {
			allPackage = allPackage
				.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
				.filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0);
			for (let packageName of allPackage) {
				if (packageName.startsWith('@'))
					packageName = packageName.split('/').slice(0, 2).join('/');
				else
					packageName = packageName.split('/')[0];

				if (!packageAlready.includes(packageName)) {
					packageAlready.push(packageName);
					if (!fs.existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
						let wating;
						try {
							wating = setInterval(() => {
								count++;
								process.stdout.write(`Installing ${packageName} ${spinner[count % spinner.length]}\r`);
							}, 80);
							execSync(`npm install ${packageName} --save`, { stdio: "pipe" });
							clearInterval(wating);
						}
						catch (error) {
							clearInterval(wating);
							throw new Error(`Can't install package ${packageName}`);
						}
					}
				}
			}
		}

		// remove from require cache and require new
		delete require.cache[require.resolve(pathCommand)];
		const command = require(pathCommand);

		// Basic checks
		const configCommand = command.config;
		if (!configCommand || typeof configCommand != "object")
			throw new Error("config of command must be an object");
		if (!command.onStart || typeof command.onStart != "function")
			throw new Error('Function onStart is missing or not a function!');
		if (!configCommand.name)
			throw new Error('Name of command is missing!');

		// return success
		return { status: "success", name: fileName, command };
	}
	catch (err) {
		return { status: "failed", name: fileName, error: err };
	}
}

function unloadScripts(folder, fileName) {
	const pathCommand = `${process.cwd()}/scripts/${folder}/${fileName}.js`;
	if (!fs.existsSync(pathCommand)) {
		const err = new Error(`File "${fileName}.js" not found`);
		err.name = "FileNotFound";
		throw err;
	}
	delete require.cache[require.resolve(pathCommand)];
	// optionally remove file or mark as unloaded by other config file
	return { status: "success", name: fileName };
}

// ---- Main init to attach to your Mirai bot ----
/**
 * Usage:
 * const miraiCmdManager = require("./mirai_cmd_manager");
 * miraiCmdManager.init(bot, { prefix: "cmd", ownerIDs: ["123456789"] });
 */
module.exports.init = function init(bot, options = {}) {
	const prefix = options.prefix || "cmd";
	const ownerIDs = options.ownerIDs || []; // allowed to use owner-only commands

	// message handler
	async function handler(event) {
		try {
			// adapt these checks to your mirai event shape
			const raw = (event.message || event.messageChain || event.rawMessage || event.content || "").toString();
			if (!raw) return;
			const text = Array.isArray(raw) ? raw.map(x => x.text || x).join(" ") : raw;
			if (!text.startsWith(prefix)) return;

			// parse args
			const body = text.trim();
			const parts = body.split(/\s+/);
			// parts[0] may be prefix OR like "cmd" or "cmd:..."
			// allow both "cmd load foo" and "cmd: load foo"
			let idx = 1;
			if (parts[0] !== prefix) {
				// if user used "cmd:load" style, try to remove prefix token from start
				const first = parts[0];
				if (first.startsWith(prefix)) {
					const remainder = first.slice(prefix.length).replace(/^[:\-]/, "");
					if (remainder) {
						parts.splice(1, 0, remainder);
					}
				}
			}
			const args = parts.slice(1);

			// owner-only check (unload/install/load)
			const senderId = event.sender?.id || event.senderId || event.userId;
			const isOwner = ownerIDs.length === 0 || ownerIDs.includes(String(senderId));

			const cmd = (args[0] || "").toLowerCase();

			// ----- load <file> -----
			if (cmd === "load" && args.length === 2) {
				if (!isOwner) return sendReply(bot, event, "Permission denied.");
				const fileName = args[1];
				if (!fileName) return sendReply(bot, event, "Please provide filename to load.");
				const info = loadScripts("cmds", fileName, console, {}, null);
				if (info.status === "success")
					return sendReply(bot, event, `✅ Loaded command "${info.name}" successfully`);
				else
					return sendReply(bot, event, `❌ Failed to load "${info.name}": ${info.error?.message || info.error}`);
			}

			// ----- loadAll -----
			if (cmd === "loadall" || (cmd === "load" && args.length > 2)) {
				if (!isOwner) return sendReply(bot, event, "Permission denied.");
				let fileNeedToLoad;
				if (cmd === "loadall") {
					const dir = path.join(__dirname); // current folder
					const targetDir = path.normalize(process.cwd() + `/scripts/cmds`);
					if (!fs.existsSync(targetDir)) return sendReply(bot, event, "No commands folder found.");
					fileNeedToLoad = fs.readdirSync(targetDir)
						.filter(f => f.endsWith(".js"))
						.map(f => f.replace(/\.js$/, ""));
				} else {
					fileNeedToLoad = args.slice(1);
				}
				const arraySucces = [];
				const arrayFail = [];
				for (const fileName of fileNeedToLoad) {
					const info = loadScripts("cmds", fileName, console, {}, null);
					if (info.status === "success") arraySucces.push(fileName);
					else arrayFail.push(`${fileName} => ${info.error?.message || info.error}`);
				}
				let msg = "";
				if (arraySucces.length) msg += `✅ Loaded ${arraySucces.length} commands.`;
				if (arrayFail.length) msg += `\n❌ Failed ${arrayFail.length}:\n` + arrayFail.join("\n");
				return sendReply(bot, event, msg);
			}

			// ----- unload <file> -----
			if (cmd === "unload") {
				if (!isOwner) return sendReply(bot, event, "Permission denied.");
				const fileName = args[1];
				if (!fileName) return sendReply(bot, event, "Please provide filename to unload.");
				try {
					const info = unloadScripts("cmds", fileName);
					return sendReply(bot, event, `✅ Unloaded "${info.name}"`);
				} catch (err) {
					return sendReply(bot, event, `❌ ${err.message}`);
				}
			}

			// ----- install <url|code> <file.js> -----
			if (cmd === "install") {
				if (!isOwner) return sendReply(bot, event, "Permission denied.");
				const maybeUrl = args[1];
				let fileName = args[2];
				let rawCode;
				if (!maybeUrl || !fileName) return sendReply(bot, event, "Usage: install <url|code> <file.js>");

				let url = maybeUrl;
				// handle swapped args (user typed: install file.js <code>)
				if (url.endsWith(".js") && !isURL(url)) {
					const tmp = fileName;
					fileName = url;
					url = tmp;
				}

				if (url.match(/https?:\/\/(.*)/)) {
					if (!fileName.endsWith(".js")) return sendReply(bot, event, "File must end with .js");
					const domain = getDomain(url);
					if (!domain) return sendReply(bot, event, "Invalid URL");
					if (domain === "pastebin.com") {
						const regex = /https:\/\/pastebin\.com\/(?!raw\/)(.*)/;
						if (url.match(regex)) url = url.replace(regex, "https://pastebin.com/raw/$1");
						if (url.endsWith("/")) url = url.slice(0, -1);
					} else if (domain === "github.com") {
						const regex = /https:\/\/github\.com\/(.*)\/blob\/(.*)/;
						if (url.match(regex)) url = url.replace(regex, "https://raw.githubusercontent.com/$1/$2");
					}
					try {
						let res = await axios.get(url);
						rawCode = res.data;
						if (domain === "savetext.net") {
							const $ = cheerio.load(rawCode);
							rawCode = $("#content").text();
						}
					} catch (err) {
						return sendReply(bot, event, `❌ Unable to fetch code from URL: ${err.message}`);
					}
				}
				else {
					// treat remaining message as code block
					// event.rawMessage expected to contain full content; here we simply join args after 'install' and before fileName
					const full = (event.rawMessage || event.message || "").toString();
					// try to extract code between 'install' and fileName
					const marker = "install";
					const idxStart = full.indexOf(marker);
					const idxFile = full.indexOf(fileName);
					if (idxStart !== -1 && idxFile !== -1 && idxFile > idxStart) {
						rawCode = full.slice(idxStart + marker.length, idxFile).trim();
					} else {
						return sendReply(bot, event, "❌ Unable to parse raw code from message.");
					}
				}

				if (!rawCode) return sendReply(bot, event, "❌ Invalid URL or code.");

				// if file exists -> ask for overwrite via reply (since Mirai reaction behavior may differ, keep simple)
				const targetPath = path.join(process.cwd(), "scripts", "cmds", fileName);
				if (fs.existsSync(targetPath)) {
					// simplest approach: overwrite immediately (or you can require reaction logic)
					try {
						fs.writeFileSync(targetPath, rawCode);
						const infoLoad = loadScripts("cmds", fileName.replace(/\.js$/, ""), console, {}, null);
						if (infoLoad.status === "success")
							return sendReply(bot, event, `✅ Installed command "${infoLoad.name}" -> ${removeHomeDir(targetPath)}`);
						else
							return sendReply(bot, event, `❌ Install failed: ${infoLoad.error?.message || infoLoad.error}`);
					} catch (err) {
						return sendReply(bot, event, `❌ Write failed: ${err.message}`);
					}
				} else {
					// write and load
					try {
						fs.ensureDirSync(path.dirname(targetPath));
						fs.writeFileSync(targetPath, rawCode);
						const infoLoad = loadScripts("cmds", fileName.replace(/\.js$/, ""), console, {}, null);
						if (infoLoad.status === "success")
							return sendReply(bot, event, `✅ Installed command "${infoLoad.name}" -> ${removeHomeDir(targetPath)}`);
						else
							return sendReply(bot, event, `❌ Install failed: ${infoLoad.error?.message || infoLoad.error}`);
					} catch (err) {
						return sendReply(bot, event, `❌ Install error: ${err.message}`);
					}
				}
			}

			// unknown syntax
			if (cmd) {
				return sendReply(bot, event, "Unknown subcommand. Usage: load | loadAll | unload | install");
			}
		} catch (err) {
			console.error("mirai_cmd_manager handler error:", err);
			await sendReply(bot, event, `Error: ${err.message}`);
		}
	}

	// attach to bot - adapt the event name to your mirai library
	if (bot && typeof bot.on === "function") {
		// common mirai.js style: bot.on("message", handler)
		bot.on("message", handler);
		// some mirai variants use "message.create"
		bot.on("message.create", handler);
		// also expose direct method
	} else {
		console.warn("mirai_cmd_manager: bot.on not available. You must call handler manually.");
	}

	// return utilities so you can call programmatically
	return {
		loadScripts,
		unloadScripts
	};
};
