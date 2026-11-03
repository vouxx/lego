import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const version = execSync("git describe --tags").toString().trim();
const readme = readFileSync("README.md", "utf8");
writeFileSync("public/readme.html", `<!-- ${version} -->\n${readme}`);
