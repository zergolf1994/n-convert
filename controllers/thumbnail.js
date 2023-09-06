const { File, Server } = require("../models");

const request = require("request");
const fs = require("fs-extra");
const shell = require("shelljs");
const path = require("path");
const sizeOf = require("image-size");
const { Ffmpeg, Scp } = require("../utils");

exports.DataThumbnail = async (req, res) => {
  try {
    const { slug } = req.params;

    const file = await File.List.findOne({ slug }).select(`_id userId`);
    if (!file?._id) return res.json({ error: true, msg: "No data_file." });

    const data_video = await File.Data.findOne({
      type: "video",
      name: ["360", "480", "720", "1080"],
    }).select(`_id name serverId`);
    if (!data_video?._id)
      return res.json({ error: true, msg: "No data_video." });

    const server = await Server.List.findOne({
      _id: data_video?.serverId,
    }).select(`_id svIp`);
    if (!server?._id) return res.json({ error: true, msg: "No data_server." });

    const imageUrl = `http://${server.svIp}:8889/thumb/${slug}/file_${data_video?.name}.mp4/thumb-1000-w150.jpg`;

    const imageFilename = path.join(
      global.dirPublic,
      slug,
      `downloaded_image.jpg`
    );

    const downImg = await DownloadImage(imageUrl, imageFilename);
    if (downImg?.error) return res.json({ error: true, msg: "No image." });

    const { width, height } = sizeOf(downImg?.savePath);

    const videoOutput = path.join(
      global.dirPublic,
      slug,
      `file_${data_video?.name}.mp4`
    );

    if (!fs.existsSync(videoOutput)) {
      return { error: true, msg: "No video." };
    }
    const { format } = await Ffmpeg.GetData(videoOutput);
    const { duration } = format;
    let data = {
      width,
      height,
      video: videoOutput,
      interval: getOptimalInterval(duration),
      columns: 10,
      output: path.join(global.dirPublic, slug, `thumbnails.jpg`),
      root_dir: global.dir,
    };
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};

exports.UploadThumbnail = async (req, res) => {
  try {
    const { slug } = req.params;

    const file = await File.List.findOne({ slug }).select(`_id slug userId`);
    if (!file?._id) return res.json({ error: true, msg: "No data_file." });

    const data_video = await File.Data.findOne({
      type: "video",
      name: ["360", "480", "720", "1080"],
    }).select(`_id name serverId`);
    if (!data_video?._id)
      return res.json({ error: true, msg: "No data_video." });

    const server = await Server.List.findOne({
      _id: data_video?.serverId,
    }).select(`_id svIp svPort svUser svPass`);

    if (!server?._id) return res.json({ error: true, msg: "No data_server." });

    let jpgInput = path.join(global.dirPublic, slug, `thumbnails.jpg`),
      jpgOutput = path.join("/home/files", slug, `thumbnails.jpg`);

    let webpInput = path.join(global.dirPublic, slug, `thumbnails.webp`),
      webpOutput = path.join("/home/files", slug, `thumbnails.webp`);

    let vttpInput = path.join(global.dirPublic, slug, `thumbnails.jpg.vtt`),
      vttpOutput = path.join("/home/files", slug, `thumbnails.vtt`);

    const uploadJpg = await Scp.StorageImage({
      row: file,
      storage: server,
      input: jpgInput,
      output: jpgOutput,
    });

    const uploadWebp = await Scp.StorageImage({
      row: file,
      storage: server,
      input: webpInput,
      output: webpOutput,
    });

    const uploadVtt = await Scp.StorageImage({
      row: file,
      storage: server,
      input: vttpInput,
      output: vttpOutput,
    });
    //console.log("uploadJpg",uploadJpg)
    //console.log("uploadWebp",uploadWebp)
    //console.log("uploadVtt",uploadVtt)
    if (uploadWebp?.error || uploadVtt?.error)
      return res.json({ error: true, msg: "upload error" });

    //สร้าง file_data
    const exist = await File.Data.findOne({
      fileId: file?._id,
      name: "vtt",
      type: "thumbnails",
    }).select(`_id`);

    if (exist?._id)
      return res.json({
        error: true,
        msg: `มีไฟล์ thumbnails ในระบบแล้ว`,
      });

    let fileDataCreate = {
      active: 1,
      type: "thumbnails",
      name: "vtt",
      serverId: server?._id,
      userId: file?.userId,
      fileId: file?._id,
    };
    let dbCreate = await File.Data.create(fileDataCreate);
    if (dbCreate?._id) {
      return res.json({ msg: "uploaded" });
    } else {
      return res.json({ error: true, msg: `ลองอีกครั้ง` });
    }
    return res.json(uploadJpg);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};
function DownloadImage(imageUrl, imageFilename) {
  return new Promise(async function (resolve, reject) {
    request(imageUrl)
      .on("response", (response) => {})
      .pipe(fs.createWriteStream(imageFilename))
      .on("close", () => {
        resolve({ savePath: imageFilename });
      })
      .on("error", (error) => {
        resolve({ error: true });
      });
  });
}

function getOptimalInterval(duration) {
  if (duration < 120) return 1;
  if (duration < 300) return 2;
  if (duration < 600) return 3;
  if (duration < 1800) return 4;
  if (duration < 3600) return 5;
  if (duration < 7200) return 10;
  return 10;
}
