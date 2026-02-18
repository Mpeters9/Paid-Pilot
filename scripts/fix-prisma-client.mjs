import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
const clientRoot = path.join(rootDir, "node_modules", "@prisma", "client");
const targetDir = path.join(clientRoot, ".prisma", "client");

function findGeneratedSource() {
  if (!fs.existsSync(pnpmDir)) return null;
  const entries = fs.readdirSync(pnpmDir).filter((name) => name.startsWith("@prisma+client@"));
  for (const entry of entries) {
    const candidate = path.join(pnpmDir, entry, "node_modules", ".prisma", "client");
    if (fs.existsSync(path.join(candidate, "index.d.ts"))) {
      return candidate;
    }
  }
  return null;
}

function copyDirectoryRecursive(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destinationPath);
      continue;
    }
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

const sourceDir = findGeneratedSource();
if (!sourceDir) {
  console.warn("[fix-prisma-client] No generated Prisma client source found in node_modules/.pnpm");
  process.exit(0);
}

copyDirectoryRecursive(sourceDir, targetDir);
console.log(`[fix-prisma-client] Copied generated client to ${targetDir}`);

