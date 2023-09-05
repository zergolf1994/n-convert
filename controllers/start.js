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
      /*shell.exec(
        `sudo bash ${global.dir}/shell/download.sh ${fileId}`,
        { async: false, silent: false },
        function (data) {}
      );*/

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
    const rows = await File.Process.aggregate([
      { $match: { fileId } },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "files",
          pipeline: [
            {
              $project: {
                _id: 1,
                type: 1,
                title: 1,
                source: 1,
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
      {
        $set: {
          slug: "$file.slug",
          title: "$file.title",
          type: "$file.type",
          source: "$file.source",
        },
      },
      {
        $project: {
          quality: 1,
          fileId: 1,
          userId: 1,
          serverId: 1,
          slug: 1,
          title: 1,
          type: 1,
          source: 1,
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
