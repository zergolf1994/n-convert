"use strict";
const express = require("express");
const router = express.Router();

const {
  ProcessStart,
  DataDownload,
  ConvertDone,
} = require("./controllers/start");

router.get("/start", ProcessStart);

router.get("/data", DataDownload);
router.get("/done/:slug", ConvertDone);

const { UploadToStorage } = require("./controllers/remote");

const { DataConvert, ConvertResolution } = require("./controllers/convert");
router.get("/convert/data/:slug", DataConvert);
router.get("/convert/:slug/:quality", ConvertResolution);

router.get("/remote/:slug/:quality", UploadToStorage);

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
