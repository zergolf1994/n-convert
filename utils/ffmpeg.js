"use strict";
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs-extra");
const { File } = require("../models");

exports.GetData = async (video) => {
  try {
    return new Promise((resolve, reject) => {
      ffmpeg(video).ffprobe((err, data) => {
        if (err) {
          resolve({ error: true });
        }
        resolve(data);
      });
    });
  } catch (error) {
    //console.error(error);
    return { error: true };
  }
};

exports.ConvertDefault = async ({ row }) => {
  try {
    const inputPath = path.join(global.dirPublic, row?.slug),
      inputFile = `file_${row?.quality}`,
      outputFile = `file_${row?.quality}.mp4`;

    let video_data = await this.GetData(path.join(inputPath, inputFile));
    const streams = video_data?.streams;
    const videoStream = streams.find((stream) => stream.codec_type === "video");
    if (!videoStream) {
      return res.json({ error: true, msg: "ไม่พบสตรีมวิดีโอในไฟล์" });
    }
    let { codec_name } = videoStream;

    const audioStream = streams.find((stream) => stream.codec_type === "audio");

    return new Promise((resolve, reject) => {
      let setup = ffmpeg(path.join(inputPath, inputFile));
      setup.output(path.join(inputPath, outputFile));
      if (codec_name != "h264") {
        setup.videoCodec("libx264");
      } else {
        setup.videoCodec("copy");
      }

      if (audioStream && audioStream?.codec_name == "acc") {
        setup.audioCodec("aac");
      }

      setup.on("start", () => {
        console.log("Convert..", row?.slug);
      });
      setup.on("progress", async (d) => {
        let percent = Math.floor(d?.percent);
        fs.writeFileSync(
          path.join(inputPath, `convert_${row?.quality}.txt`),
          JSON.stringify({ percent: percent || 0 }),
          "utf8"
        );
        //console.log("Convert..", row?.slug, percent);
      });
      setup.on("end", async () => {
        fs.writeFileSync(
          path.join(inputPath, `convert_${row?.quality}.txt`),
          JSON.stringify({ percent: 100 }),
          "utf8"
        );
        resolve({ msg: "converted" });
      });
      setup.on("error", async (err, stdout, stderr) => {
        fs.writeFileSync(
          path.join(inputPath, `convert_${row?.quality}.txt`),
          JSON.stringify({ percent: 100 }),
          "utf8"
        );
        console.log(`error video-convert`, err);
        resolve({ error: true, err });
      });
      setup.run();
    });
  } catch (error) {
    //console.error(error);
    return { error: true };
  }
};

exports.ConvertQuality = async ({ slug, quality, useType }) => {
  try {
    const videoInput = path.join(global.dirPublic, slug, `file_default.mp4`),
      folderPath = path.join(global.dirPublic, slug);

    if (!fs.existsSync(videoInput)) {
      return { error: true, msg: "No video." };
    }
    let { streams } = await this.GetData(videoInput);

    const videoStream = streams.find((stream) => stream.codec_type === "video");
    if (!videoStream) {
      return res.json({ error: true, msg: "ไม่พบสตรีมวิดีโอในไฟล์" });
    }

    let { width, height, codec_name } = videoStream;

    let resolWidth = {
      1080: 1920,
      720: 1280,
      480: 854,
      360: 640,
      240: 426,
    };

    let setSize = ``;
    if (useType == "height") {
      if (width > height) {
        setSize = `?x${quality}`;
      } else {
        setSize = `${quality}x?`;
      }
    } else {
      setSize = `${quality}x?`;
      if (width > height) {
        setSize = `${resolWidth[quality]}x?`;
      } else {
        setSize = `?x${resolWidth[quality]}`;
      }
    }
    return new Promise((resolve, reject) => {
      let setup = ffmpeg(videoInput);
      setup.output(path.join(folderPath, `file_${quality}.mp4`));
      setup.outputOptions([
        "-c:v libx264", // เลือกใช้ H.264 ในการเข้ารหัสวิดีโอ
        "-crf 23", // ควบคุมคุณภาพวิดีโอ (ค่าประมาณ 17-23 เป็นไปตามความต้องการ)
        "-preset medium", // ตั้งค่า preset เป็น medium เพื่อสมดุลคุณภาพและเวลาทำการแปลง
        "-profile:v high", // ใช้โปรไฟล์ H.264 High Profile
        "-level:v 4.2", // ใช้ระดับ H.264 Level 4.2
        "-movflags +faststart", // เปิดใช้งาน Fast Start เพื่อให้เปิดเล่นได้ก่อนที่ไฟล์จะถูกดาวน์โหลดเสร็จสิ้น
      ]);
      setup.size(setSize);

      setup.on("start", () => {
        console.log(`${slug} | convert | ${quality}`);
      });
      setup.on("progress", async (d) => {
        let percent = Math.floor(d?.percent);
        fs.writeFileSync(
          path.join(folderPath, `convert_${quality}.txt`),
          JSON.stringify({ percent: percent || 0 }),
          "utf8"
        );
      });
      setup.on("end", async () => {
        fs.writeFileSync(
          path.join(folderPath, `convert_${quality}.txt`),
          JSON.stringify({ percent: 100 }),
          "utf8"
        );
        resolve({
          msg: "converted",
          output: path.join(folderPath, `file_${quality}.mp4`),
        });
      });
      setup.on("error", async (err, stdout, stderr) => {
        fs.writeFileSync(
          path.join(folderPath, `convert_${quality}.txt`),
          JSON.stringify({ percent: 100 }),
          "utf8"
        );
        //ล็อคประมวลผล
        const row = await File.List.findOne({ slug });
        await File.Lock.create({
          msg: "videoConvertError",
          userId: row?.userId,
          fileId: row?._id,
        });
        await useCurl.get(`http://127.0.0.1/server/reload`);
        console.log(`error video-convert`, err);
        resolve({ error: true, err });
      });
      setup.run();
    });
  } catch (error) {
    console.error(error);
    return { error: true };
  }
};
