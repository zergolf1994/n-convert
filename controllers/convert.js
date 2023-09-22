const fs = require("fs-extra");
const path = require("path");
const { Ffmpeg, Cacher } = require("../utils");
const { ConvertQuality } = require("../utils/ffmpeg");
const { File } = require("../models");

exports.DataConvert = async (req, res) => {
  try {
    const { slug } = req.params;

    const rows = await File.List.aggregate([
      { $match: { slug } },
      //file_data
      {
        $lookup: {
          from: "file_datas",
          localField: "_id",
          foreignField: "fileId",
          as: "datas",
          pipeline: [
            { $match: { type: "video" } },
            {
              $project: {
                _id: 0,
                name: 1,
              },
            },
          ],
        },
      },
      //users
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "users",
          pipeline: [
            {
              $project: {
                _id: 0,
                max1080p: 1,
                max720p: 1,
                max480p: 1,
                max360p: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$users", 0] },
        },
      },
      {
        $addFields: {
          video: {
            $map: {
              input: "$datas",
              as: "data",
              in: "$$data.name",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          video: 1,
          user: 1,
        },
      },
    ]);

    if (!rows?.length) return res.json({ error: true, msg: "No Data" });
    const row = rows?.at(0);
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
      1080: row?.user?.max1080p || [360, 480, 720, 1080],
      720: row?.user?.max720p || [360, 480, 720],
      480: row?.user?.max480p || [360, 480],
      360: row?.user?.max360p || [360],
    };
    let testRes = row?.video;
    let Array1 = resolutions[data.maxResolution].map(String);

    for (let i = 0; i < Array1.length; i++) {
      const indexInArray2 = testRes.indexOf(Array1[i]);
      if (indexInArray2 != -1) {
        Array1.splice(i, 1);
        i--; // ลดค่า i ลงเพื่อปรับค่า index ที่ถูกลบ
      }
    }
    Array1.sort();
    data.resolutions = Array1;

    await Cacher.saveData(slug, data);

    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};

exports.ConvertResolution = async (req, res) => {
  try {
    const { slug, quality, useType } = req.body;
    const videoInput = path.join(global.dirPublic, slug, `file_default.mp4`);

    if (!fs.existsSync(videoInput)) {
      return res.json({ error: true, msg: "No video." });
    }
    const data = await ConvertQuality({ slug, quality, useType });
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};
