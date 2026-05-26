import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const serverDir = join(process.cwd(), "dist", "server");
const serverJs = join(serverDir, "server.js");
const indexJs = join(serverDir, "index.js");

if (existsSync(serverJs)) {
  console.log("dist/server/server.js OK");
  process.exit(0);
}

if (existsSync(indexJs)) {
  copyFileSync(indexJs, serverJs);
  console.log("Criado dist/server/server.js a partir de index.js (build Cloudflare).");
  process.exit(0);
}

console.error("Build incompleto: dist/server/server.js ou index.js não encontrado.");
process.exit(1);
