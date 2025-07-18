import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import https from "https";
import "dotenv/config";

// Init bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const getUploadServer = async () => {
  const res = await axios.get("https://api.gofile.io/getServer");
  return res.data.data.server;
};

const uploadToGofile = async (filePath) => {
  const server = await getUploadServer();
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const res = await axios.post(`https://${server}.gofile.io/uploadFile`, form, {
    headers: form.getHeaders(),
  });

  return res.data.data.downloadPage;
};

// Listen for any file
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.document && !msg.video && !msg.audio) {
    return bot.sendMessage(chatId, "Send me a file, video, audio, or document.");
  }

  const file = msg.document || msg.video || msg.audio;

  const fileId = file.file_id;
  const fileName = file.file_name || "file";
  const fileExt = fileName.split(".").pop();

  try {
    const fileLink = await bot.getFileLink(fileId);

    const filePath = `./temp.${fileExt}`;
    const writer = fs.createWriteStream(filePath);
    const response = await https.get(fileLink, (res) => res.pipe(writer));

    await new Promise((resolve) => writer.on("finish", resolve));

    const downloadLink = await uploadToGofile(filePath);

    bot.sendMessage(
      chatId,
      `✅ File Uploaded!\n\nFile: *${fileName}*\nLink: ${downloadLink}`,
      { parse_mode: "Markdown" }
    );

    fs.unlinkSync(filePath); // Cleanup
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Error uploading file.");
  }
});
