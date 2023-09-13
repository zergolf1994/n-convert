const fs = require("fs-extra");
const path = require("path");
const { Ffmpeg } = require("../utils");
const { ConvertQuality } = require("../utils/ffmpeg");

exports.DataConvert = async (req, res) => {
  try {
    const { slug } = req.params;

    const videoInput = path.join(global.dirPublic, slug, `file_default.mp4`);

    if (!fs.existsSync(videoInput)) {
      return res.json({ error: true, msg: "No video.", videoInput });
    }
    const { streams } = await Ffmpeg.GetData(videoInput);

    const videoStream = streams.find((stream) => stream.codec_type === "video");

    if (!videoStream) {
      return res.json({ error: true, msg: "ไม่พบสตรีมวิดีโอในไฟล์" });
    }
    let { width, height, codec_name } = videoStream;

    if (!width && !height)
      return res.json({ error: true, msg: "ขนาดวิดีโอไม่ถูกต้อง" });

    let data = {
      width,
      height,
      codec_name,
      video_type: width > height ? "horizontal" : "vertical",
    };

    if (data.video_type == "horizontal") {
      if (width >= 1920) data.maxResolution = 1080;
      else if (width >= 1280) data.maxResolution = 720;
      else if (width >= 854) data.maxResolution = 480;
      else if (width >= 640) data.maxResolution = 360;
      else if (width >= 426) data.maxResolution = 240;
    } else {
      if (height >= 1920) data.maxResolution = 1080;
      else if (height >= 1280) data.maxResolution = 720;
      else if (height >= 854) data.maxResolution = 480;
      else if (height >= 640) data.maxResolution = 360;
      else if (height >= 426) data.maxResolution = 240;
    }

    let resolutions = {
      1080: [640, 854, 1280, 1920],
      720: [640, 854, 1280],
      480: [640, 854],
      360: [640],
      240: [426],
    };

    data.resolutions = resolutions[data.maxResolution];
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};

exports.ConvertResolution = async (req, res) => {
  try {
    const { slug , quality } = req.params;

    const videoInput = path.join(global.dirPublic, slug, `file_default.mp4`);

    if (!fs.existsSync(videoInput)) {
      return res.json({ error: true, msg: "No video." });
    }
    const data = await ConvertQuality({ slug , quality })
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};
