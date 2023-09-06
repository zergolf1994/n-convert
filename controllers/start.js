const { File, Server } = require("../models");
const { getOs, Scp, Ffmpeg, useCurl } = require("../utils");
const fs = require("fs-extra");
const shell = require("shelljs");
const path = require("path");

exports.ProcessStart = async (req, res) => {
  try {
    const { fileId } = req.query;
    let { ipV4 } = getOs();

    const server = await Server.List.findOne({
      type: "convert",
      active: true,
      isWork: false,
      svIp: ipV4,
    }).select(`_id svIp`);

    if (!server?._id) return res.json({ error: true, msg: `เซิฟเวอร์ไม่ว่าง` });
    //
    const process = await File.Process.findOne({
      type: "convert",
      //quality: "convert",
      fileId,
    }).select(`_id`);

    if (process?._id)
      return res.json({ error: true, msg: `ไฟล์นี้กำลังประมวลผล` });

    const files = await File.List.findOne({ _id: fileId }).select(
      `_id userId slug`
    );

    if (!files?._id) return res.json({ error: true, msg: `ไม่พบไฟล์` });

    let dataCreate = {
      type: "convert",
      //quality: "default",
      serverId: server?._id,
      userId: files?.userId,
      fileId: files?._id,
    };

    let dbCreate = await File.Process.create(dataCreate);
    if (dbCreate?._id) {
      await Server.List.findByIdAndUpdate(
        { _id: server?._id },
        { isWork: true }
      );
      // คำสั่ง เพื่อดำเนินการ ส่งต่อไปยัง bash
      shell.exec(
        `sudo bash ${global.dir}/shell/download.sh ${fileId}`,
        { async: false, silent: false },
        function (data) {}
      );

      return res.json({
        msg: "สร้างสำเร็จ",
      });
    } else {
      return res.json({ msg: `ลองอีกครั้ง` });
    }
  } catch (err) {
    console.log(err);
    return res.json({ error: true, msg: "PreStart" });
  }
};

exports.DataDownload = async (req, res) => {
  try {
    const { fileId } = req.query;
    const rows = await File.Data.aggregate([
      { $match: { fileId } },
      //file
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "files",
          pipeline: [
            {
              $project: {
                _id: 0,
                slug: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          file: { $arrayElemAt: ["$files", 0] },
        },
      },
      //server
      {
        $lookup: {
          from: "servers",
          localField: "serverId",
          foreignField: "_id",
          as: "servers",
          pipeline: [
            {
              $project: {
                _id: 0,
                svIp: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          server: { $arrayElemAt: ["$servers", 0] },
        },
      },
      {
        $set: {
          slug: "$file.slug",
          source: {
            $concat: [
              "http://",
              "$server.svIp",
              ":8889/mp4/",
              "$file.slug",
              "/file_",
              "$$ROOT.name",
              ".mp4",
            ],
          },
        },
      },
      {
        $project: {
          fileId: 1,
          slug: 1,
          source: 1,
          //contentIndex: 0,
          //contentMaster: 0,
        },
      },
    ]);

    if (!rows?.length) return res.json({ error: true, msg: `ไม่พบข้อมูล` });
    const row = rows[0];
    let outPutPath = `${global.dirPublic}${row?.slug}`;
    if (!fs.existsSync(outPutPath)) {
      fs.mkdirSync(outPutPath, { recursive: true });
    }
    let data = {
      ...row,
      outPutPath,
      root_dir: global.dir,
    };

    return res.json(data);
  } catch (err) {
    console.log(err);
    return res.json({ error: true, msg: "DataRemote" });
  }
};

exports.ConvertDone = async (req, res) => {
  try {
    const { slug } = req.params;

    const file = await File.List.findOne({ slug }).select(`_id slug userId`);
    if (!file?._id) return res.json({ error: true, msg: "No data_file." });

    const totalVideo = await File.Data.countDocuments({
      fileId: file?._id,
      type: "video",
      name: ["360", "480", "720", "1080"],
    });
    if (!totalVideo) return res.json({ error: true, msg: "No totalVideo." });

    const file_process = await File.Process.findOne({
      fileId: file?._id,
      type: "convert",
    });

    await Server.List.findByIdAndUpdate(
      { _id: file_process?.serverId },
      { isWork: false }
    );
    await File.Process.deleteOne({ _id: file_process?._id });

    shell.exec(
      `sudo rm -rf ${global.dirPublic}${file?.slug}`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({ msg: "converted" });
  } catch (err) {
    console.log(err);
    return res.json({ error: true, msg: "ConvertDone" });
  }
};
