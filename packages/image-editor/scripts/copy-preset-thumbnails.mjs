import fs from "node:fs";

const source = new URL("../src/assets/preset-thumbnails", import.meta.url);
const destination = new URL("../dist/assets/preset-thumbnails", import.meta.url);

if (fs.existsSync(source)) {
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}