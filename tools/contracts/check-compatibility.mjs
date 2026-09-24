import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const compatibility = JSON.parse(await readFile(`${root}/contracts/compatibility.v1.json`, "utf8"));
if (compatibility.contract_version !== "1.0.0") throw new Error("unsupported contract baseline");
if (!compatibility.breaking_changes_require_major) throw new Error("breaking changes must require a major version");
console.log(`compatibility ${compatibility.contract_version} supports ${compatibility.supported_minor_versions.join(", ")}`);
