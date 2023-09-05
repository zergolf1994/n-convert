"use strict";
const express = require("express");
const router = express.Router();

const { ProcessStart, DataDownload } = require("./controllers/start");

router.get("/start", ProcessStart);

router.get("/data", DataDownload);

const { UploadToStorage, ConvertToMp4 } = require("./controllers/remote");

router.get("/convert", ConvertToMp4);

router.get("/remote", UploadToStorage);

const { DataVideo, DownloadPercent } = require("./controllers/data");
router.get("/video/:fileId/:fileName", DataVideo);

router.get("/download-percent", DownloadPercent);

const {
  serverCreate,
  serverReload,
  serverReloaded,
} = require("./controllers/server");
router.get("/server/create", serverCreate);
router.get("/server/reload", serverReload);
router.get("/server/reloaded", serverReloaded);

router.all("*", async (req, res) => {
  return res.status(404).json({ error: true, msg: `link_not_found` });
});

module.exports = router;
