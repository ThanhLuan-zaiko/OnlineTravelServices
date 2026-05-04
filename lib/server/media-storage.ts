import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { uuidv7 } from "uuidv7";

const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_IMAGE_EDGE = 3840;
const THUMB_EDGE = 640;

async function ensureDirectory(dir: string) {
  await mkdir(dir, { recursive: true });
}

function buildPublicUrl(...segments: string[]) {
  return `/uploads/${segments.map((segment) => segment.replace(/^\/+|\/+$/g, "")).join("/")}`;
}

function sanitizeName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export type StoredImageAsset = {
  fullPath: string;
  fullUrl: string;
  thumbnailPath: string;
  thumbnailUrl: string;
};

export async function storeImageAsset(input: {
  folder: string[];
  sourceBuffer: Buffer;
  sourceName: string;
}) {
  const assetId = String(uuidv7());
  const fileStem = sanitizeName(path.parse(input.sourceName).name) || "image";
  const folderPath = path.join(PUBLIC_UPLOADS_ROOT, ...input.folder);

  await ensureDirectory(folderPath);

  const fullFileName = `${fileStem}-${assetId}-4k.webp`;
  const thumbFileName = `${fileStem}-${assetId}-thumb.webp`;
  const fullPath = path.join(folderPath, fullFileName);
  const thumbnailPath = path.join(folderPath, thumbFileName);

  const transformed = sharp(input.sourceBuffer).rotate().webp({ quality: 90 });
  const fullBuffer = await transformed
    .clone()
    .resize({ fit: "inside", height: MAX_IMAGE_EDGE, width: MAX_IMAGE_EDGE, withoutEnlargement: true })
    .toBuffer();
  const thumbBuffer = await transformed
    .clone()
    .resize({ fit: "inside", height: THUMB_EDGE, width: THUMB_EDGE, withoutEnlargement: true })
    .toBuffer();

  await writeFile(fullPath, fullBuffer);
  await writeFile(thumbnailPath, thumbBuffer);

  return {
    fullPath,
    fullUrl: buildPublicUrl(...input.folder, fullFileName),
    thumbnailPath,
    thumbnailUrl: buildPublicUrl(...input.folder, thumbFileName),
  } satisfies StoredImageAsset;
}

export async function removeIfExists(filePath: string) {
  await rm(filePath, { force: true });
}
