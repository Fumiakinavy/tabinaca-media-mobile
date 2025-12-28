import fs from "fs";
import path from "path";
import { globby } from "globby";
import sharp from "sharp";

const INPUT_DIR = path.join(process.cwd(), "public", "images");
const TARGET_WIDTHS = [600, 800];
const FORMATS: Array<"webp" | "avif"> = ["webp", "avif"];

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function optimize() {
  const patterns = [
    path.join(INPUT_DIR, "**/*.{jpg,jpeg,png,JPG,JPEG,PNG}"),
    "!" + path.join(INPUT_DIR, "**/*-**w.{webp,avif}"),
  ];
  const files = await globby(patterns);

  if (files.length === 0) {
    console.log("No images found under public/images");
    return;
  }

  for (const file of files) {
    const { dir, name } = path.parse(file);
    const buffer = await fs.promises.readFile(file);

    for (const width of TARGET_WIDTHS) {
      for (const format of FORMATS) {
        const outName = `${name}-${width}w.${format}`;
        const outPath = path.join(dir, outName);

        if (await fileExists(outPath)) {
          continue;
        }

        await ensureDir(dir);
        await sharp(buffer)
          .resize({ width, withoutEnlargement: true })
          [format]({ quality: 70 })
          .toFile(outPath);

        console.log(`Generated ${outPath}`);
      }
    }
  }
}

optimize().catch((err) => {
  console.error("optimize-images failed", err);
  process.exit(1);
});
