import sharp from "sharp";
import { resolve, join } from "node:path";
import fs from "node:fs";

async function generateIcons() {
  const rootDir = resolve(process.cwd());
  const publicDir = join(rootDir, "public");
  const sourceFile = join(publicDir, "source-icon.png");

  if (!fs.existsSync(sourceFile)) {
    console.error(`Source icon not found at ${sourceFile}`);
    process.exit(1);
  }

  const sizes = [
    { name: "app-store-icon.png", size: 1024, flatten: true },
    { name: "play-store-icon.png", size: 512, flatten: false },
    { name: "android-chrome-512x512.png", size: 512, flatten: false },
    { name: "android-chrome-192x192.png", size: 192, flatten: false },
    { name: "apple-touch-icon.png", size: 180, flatten: false },
    { name: "favicon.png", size: 32, flatten: false },
  ];

  for (const { name, size, flatten } of sizes) {
    console.log(`Generating ${name} (${size}x${size})...`);
    let img = sharp(sourceFile).resize(size, size, { fit: "cover" });

    if (flatten) {
      img = img.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    await img.toFile(join(publicDir, name));
  }

  console.log("All icons generated successfully!");
}

generateIcons().catch(console.error);
