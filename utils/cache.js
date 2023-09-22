const path = require("path");
const fs = require("fs-extra");

exports.getData = async (slug) => {
  try {
    let cacheDir = path.join(global.dir, "public", slug),
      cacheFile = path.join(cacheDir, `data.json`);

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    if (fs.existsSync(cacheFile)) {
      const read = fs.readFileSync(cacheFile, "utf8");
      try {
        let Json = JSON.parse(read);
        return Json;
      } catch (error) {
        return { error: true };
      }
    } else {
      return { error: true };
    }
  } catch (error) {
    return { error: true };
  }
};

exports.saveData = (slug, data) => {
  try {
    let cacheDir = path.join(global.dir, "public", slug),
      cacheFile = path.join(cacheDir, `data.json`);

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(data), "utf8");
  } catch (error) {
    return { error: true };
  }
};
