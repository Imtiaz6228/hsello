import fs from "node:fs";
import path from "node:path";
import type { Writable } from "node:stream";
import * as archiverModule from "archiver";

type ArchiverFactory = (format: "zip", options?: archiverModule.ArchiverOptions) => archiverModule.Archiver;
const createArchive = ((archiverModule as unknown as { default?: ArchiverFactory }).default ?? archiverModule) as ArchiverFactory;

export type ZipInput = {
  name: string;
  storagePath?: string;
  content?: Buffer | string;
};

function safeZipName(value: string, index: number) {
  const base = path.basename(value || `product-file-${index + 1}`)
    .replace(/[\u0000-\u001f<>:"|?*\\/]+/g, "-")
    .replace(/^\.+$/, "file")
    .slice(0, 160);
  return base || `product-file-${index + 1}`;
}

export async function streamZip(output: Writable, files: ZipInput[]) {
  if (files.length > 100) throw new Error("A ZIP archive can contain at most 100 files.");
  const archive = createArchive("zip", { zlib: { level: 6 } });
  const finished = new Promise<void>((resolve, reject) => {
    output.once("finish", resolve);
    output.once("error", reject);
    archive.once("error", reject);
  });
  archive.pipe(output);
  files.forEach((file, index) => {
    const name = safeZipName(file.name, index);
    if (file.content !== undefined) archive.append(file.content, { name });
    else archive.append(fs.createReadStream(path.resolve(file.storagePath!)), { name });
  });
  await archive.finalize();
  await finished;
}
