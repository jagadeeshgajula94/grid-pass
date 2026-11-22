import { existsSync } from "node:fs";

if (existsSync("node_modules/husky/bin.mjs")) {
  const { default: husky } = await import("husky");
  husky();
}
