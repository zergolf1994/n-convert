const { Ffmpeg, Cacher } = require("../utils");
const path = require("path");
const fs = require("fs-extra");
const request = require("request");
const { File } = require("../models");

exports.DataVideo = async (req, res) => {
  try {
    const { fileId, fileName } = req.params;

    const outPutPath = `${global.dirPublic}${fileId}/${fileName}`;
    const data = await Ffmpeg.GetData(outPutPath);

    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};

exports.DownloadPercent = async (req, res) => {
  try {
    const { fileId } = req.query;
    if (!fileId) {
      return res.json({ error: true, msg: "กรุณาใส่ fileId" });
    }
    if (!fs.existsSync(`${global.dirPublic}${fileId}`)) {
      return res.json({ error: true, msg: "ไม่พบข้อมูล" });
    }
    const dataConvert = await Cacher.getData(fileId);
    let data = {};
    if (dataConvert?.error) {
      const downloadPath = `${global.dirPublic}${fileId}/file_default.txt`;
      if (!fs.existsSync(downloadPath)) {
        data.download = 0;
      } else {
        const logData = await fs.readFileSync(downloadPath, "utf-8");

        let code = logData
          .toString()
          .replace(/ /g, "")
          .replace(/#/g, "")
          .split(/\r?\n/);

        const dataRaw = code.filter((e) => {
          return e != "";
        });

        const Array = dataRaw
          .at(0)
          .split(/\r/)
          .filter((e) => {
            return Number(e.replace(/%/g, ""));
          })
          .map((e) => {
            return Number(e.replace(/%/g, ""));
          });
        data.download = Math.max(...Array) || 0;
      }
    } else {
      data.download = 100;
      let q = dataConvert.resolutions || [];
      for (const key in q) {
        if (Object.hasOwnProperty.call(q, key)) {
          const quality = q[key];

          const convertPath = `${global.dirPublic}${fileId}/convert_${quality}.txt`;
          if (!fs.existsSync(convertPath)) {
            data[quality] = 0;
          } else {
            const logData = await fs.readFileSync(convertPath, "utf-8");
            try {
              data[quality] = JSON.parse(logData).percent || 0;
            } catch (error) {
              data[quality] = 0;
            }
          }
        }
      }
    }

    const sum = Object.values(data).reduce((acc, value) => acc + value, 0);
    const total = Object.values(data).length * 100;
    let totalPercent = ((sum * 100) / total ?? 0).toFixed(0) || 0;
    //find file id
    const files = await File.List.findOne({ slug: fileId }).select(`_id`);
    if (files?._id) {
      await File.Process.findOneAndUpdate(
        { fileId: files?._id, type: "convert" },
        { percent: totalPercent }
      );
    }
    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true });
  }
};

function getReq(url) {
  try {
    return new Promise(async function (resolve, reject) {
      if (!url) resolve({ error: true });
      request({ url }, function (error, response, body) {
        if (!body) reject();
        resolve(JSON.parse(body));
      });
    });
  } catch (error) {
    return { error: true };
  }
}
