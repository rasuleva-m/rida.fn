import fs from "node:fs";
import path from "node:path";
import heicConvert from "heic-convert";

const root = process.cwd();
const inputDir = path.join(root, "src", "PortfolioPic");
const outputDir = path.join(inputDir, "converted");

fs.mkdirSync(outputDir, { recursive: true });

/** @param {string} filePath */
async function convertHeicToJpeg(filePath) {
  const inputBuffer = fs.readFileSync(filePath);
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: "JPEG",
    quality: 0.92,
  });
  return Buffer.from(outputBuffer);
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.join(dir, d.name));
}

const files = listFiles(inputDir);
const heicFiles = files.filter((f) => /\.heic$/i.test(f));

let convertedCount = 0;
for (const heicPath of heicFiles) {
  const baseName = path.basename(heicPath).replace(/\.[^.]+$/, "");
  const outPath = path.join(outputDir, `${baseName}.jpg`);
  if (fs.existsSync(outPath)) continue;

  process.stdout.write(`Converting ${path.basename(heicPath)} -> ${path.relative(root, outPath)} ... `);
  try {
    const jpeg = await convertHeicToJpeg(heicPath);
    fs.writeFileSync(outPath, jpeg);
    convertedCount += 1;
    process.stdout.write("OK\n");
  } catch (err) {
    process.stdout.write("FAILED\n");
    console.error(err);
  }
}

console.log(`Done. Converted: ${convertedCount}, Already existed: ${heicFiles.length - convertedCount}`);

