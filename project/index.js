import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { uploadToGofile } from "./utils/gofileUpload.js";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  const file = msg.document || msg.video || msg.audio;
  if (!file) {
    return bot.sendMessage(chatId, "❌ Send me a video/audio/pdf/zip file to upload.");
  }

  const fileId = file.file_id;
  const fileName = file.file_name || `file_${Date.now()}`;
  const mimeType = file.mime_type;
  const ext = mime.extension(mimeType) || "bin";
  const filePath = path.join(TEMP_DIR, `${fileName}.${ext}`);

  try {
    bot.sendMessage(chatId, "📥 Downloading file from Telegram...");
    const fileLink = await bot.getFileLink(fileId);

    const writer = fs.createWriteStream(filePath);
    const response = await fetch(fileLink);
    if (!response.ok) throw new Error("Download error");

    await new Promise((resolve, reject) => {
      response.body.pipe(writer);
      response.body.on("error", reject);
      writer.on("finish", resolve);
    });

    bot.sendMessage(chatId, "📤 Uploading to GoFile.io...");
    const gofileLink = await uploadToGofile(filePath);

    await bot.sendMessage(chatId, `✅ File uploaded:\n\n🔗 ${gofileLink}`);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error: " + err.message);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
