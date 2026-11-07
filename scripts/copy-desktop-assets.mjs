import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "build", "life-quest");
const assets = [
    "index.html",
    "household.html",
    "finance.html",
    "style.css",
    "app.js",
    "household.js",
    "finance.js",
    "spotify.js",
    "level-up.gif",
    "preview (1).webp"
];

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

for (const asset of assets) {
    copyFileSync(join(projectRoot, asset), join(outputDirectory, asset));
}