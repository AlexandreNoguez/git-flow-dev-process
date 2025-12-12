// scripts/extract-notes.mjs
// Usage: node scripts/extract-notes.mjs 1.1.3

import fs from "node:fs";

const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/extract-notes.mjs <version>");
  process.exit(1);
}

const changelogPath = "../CHANGELOG.md";

if (!fs.existsSync(changelogPath)) {
  console.error(`File ${changelogPath} not found`);
  process.exit(1);
}

const changelog = fs.readFileSync(changelogPath, "utf8");
const lines = changelog.split("\n");

const headerText = `[${version}]`;

let startIndex = -1;

// Find the line that contains the version heading (## or ###)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const isHeader =
    (line.startsWith("## ") || line.startsWith("### ")) &&
    line.includes(headerText);

  if (isHeader) {
    startIndex = i;
    break;
  }
}

if (startIndex === -1) {
  console.error(`Version ${version} not found in ${changelogPath}`);
  process.exit(1);
}

// Collect lines until the next version heading (## or ### with [...] )
const result = [];
for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i];

  if (i > startIndex) {
    const trimmed = line.trim();
    const isNextHeader =
      (trimmed.startsWith("## ") || trimmed.startsWith("### ")) &&
      trimmed.includes("[") &&
      trimmed.includes("]");

    if (isNextHeader) {
      break;
    }
  }

  result.push(line);
}

console.log(result.join("\n").trim());
