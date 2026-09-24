import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pkg = JSON.parse(await readFile(`${root}/package.json`, "utf8"));
const tag = process.env.ORIN_PLATFORM_TAG;
if (tag && tag !== `platform-v${pkg.version}`) throw new Error(`tag ${tag} does not match package ${pkg.version}`);
console.log(`release baseline ${pkg.version} verified`);
