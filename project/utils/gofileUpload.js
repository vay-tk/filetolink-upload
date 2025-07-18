import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

export const uploadToGofile = async (filePath) => {
  try {
    const { data: serverRes } = await axios.get("https://api.gofile.io/getServer");
    const server = serverRes.data.data.server;

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const { data: uploadRes } = await axios.post(
      `https://${server}.gofile.io/uploadFile`,
      form,
      {
        headers: form.getHeaders(),
      }
    );

    if (uploadRes.status !== "ok") throw new Error("Upload failed");

    return uploadRes.data.downloadPage;
  } catch (error) {
    throw new Error("Failed to upload: " + error.message);
  }
};
