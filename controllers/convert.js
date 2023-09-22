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
      useType: "height",
    };

    if (data.video_type == "horizontal") {
      if (width >= 1920 || height >= 1080) {
        data.maxResolution = 1080;
        if (width >= 1920) {
          data.useType = "width";
        }
      } else if (width >= 1280 || height >= 720) {
        data.maxResolution = 720;
        if (width >= 1280) {
          data.useType = "width";
        }
      } else if (width >= 854 || height >= 480) {
        data.maxResolution = 480;
        if (width >= 854) {
          data.useType = "width";
        }
      } else {
        data.maxResolution = 360;
        if (width >= 640) {
          data.useType = "width";
        }
      }
    } else {
      if (width >= 1080 || height >= 1920) {
        data.maxResolution = 1080;
        if (width >= 1080) {
          data.useType = "width";
        }
      } else if (width >= 720 || height >= 1280) {
        data.maxResolution = 720;
        if (width >= 720) {
          data.useType = "width";
        }
      } else if (width >= 480 || height >= 854) {
        data.maxResolution = 480;
        if (width >= 480) {
          data.useType = "width";
        }
      } else {
        data.maxResolution = 360;
        if (width >= 360) {
          data.useType = "width";
        }
      }
    }

    let resolutions = {
      1080: [360, 480, 720, 1080],
      720: [360, 480, 720],
      480: [360, 480],
      360: [360],
      240: [240],
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
    const { slug, quality } = req.params;

    const videoInput = path.join(global.dirPublic, slug, `file_default.mp4`);

    if (!fs.existsSync(videoInput)) {
      return res.json({ error: true, msg: "No video." });
    }
    const data = await ConvertQuality({ slug, quality });
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};
