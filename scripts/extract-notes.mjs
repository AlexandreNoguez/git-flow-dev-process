import fs from "node:fs";

const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/extract-notes.mjs <version>");
  process.exit(1);
}

const changelogPath = "CHANGELOG.md";

if (!fs.existsSync(changelogPath)) {
  console.error(`File ${changelogPath} not found`);
  process.exit(1);
}

const content = fs.readFileSync(changelogPath, "utf8");

// Match lines like:
// ## 1.1.0 (2025-12-10)
// ## 1.1.0-rc.1 (2025-12-10)
// etc.
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headingRegex = new RegExp(`^##\\s+${escapedVersion}\\b.*$`, "m");

const match = content.match(headingRegex);

if (!match) {
  console.error(`Version ${version} not found in CHANGELOG.md`);
  process.exit(1);
}

const startIndex = match.index;
const afterHeading = content.slice(startIndex);

// Find next "## " heading to cut only this section
const nextHeadingRegex = /^##\s+/m;
const restWithoutFirstLine = afterHeading.slice(afterHeading.indexOf("\n") + 1);
const nextMatch = restWithoutFirstLine.match(nextHeadingRegex);

let endIndex;
if (nextMatch) {
  endIndex = startIndex + afterHeading.indexOf("\n") + 1 + nextMatch.index;
} else {
  endIndex = content.length;
}

const section = content.slice(startIndex, endIndex).trim();
console.log(section);
