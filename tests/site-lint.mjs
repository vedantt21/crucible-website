import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([".git", "assets", "images", "node_modules"]);
const lintedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".yml",
  ".yaml",
]);

const failures = [];
let filesChecked = 0;
let rulesRun = 0;

const fail = (filePath, message) => {
  failures.push(`${filePath}: ${message}`);
};

const check = (condition, filePath, message) => {
  rulesRun += 1;

  if (!condition) {
    fail(filePath, message);
  }
};

const collectFiles = (directory) => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectFiles(join(directory, entry.name)));
      }

      continue;
    }

    if (entry.isFile() && lintedExtensions.has(extname(entry.name))) {
      files.push(join(directory, entry.name));
    }
  }

  return files.sort();
};

const getRelativePath = (absolutePath) => relative(repoRoot, absolutePath);

const getTags = (content, tagName) =>
  content.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) || [];

const hasAttr = (tag, attrName) =>
  new RegExp(`\\s${attrName}(?:\\s*=|\\s|>)`, "i").test(tag);

const lintTextFile = (filePath, content) => {
  check(!content.includes("\r"), filePath, "uses CRLF line endings");
  check(content.endsWith("\n"), filePath, "must end with a newline");

  const lines = content.split("\n");
  const linesToCheck = content.endsWith("\n") ? lines.slice(0, -1) : lines;

  linesToCheck.forEach((line, index) => {
    check(
      !/[ \t]$/.test(line),
      filePath,
      `line ${index + 1} has trailing whitespace`
    );
    check(!line.includes("\t"), filePath, `line ${index + 1} uses a tab`);
  });
};

const lintHtml = (filePath, content) => {
  check(
    /^<!doctype html>/i.test(content.trimStart()),
    filePath,
    "must start with <!DOCTYPE html>"
  );

  for (const imgTag of getTags(content, "img")) {
    check(hasAttr(imgTag, "alt"), filePath, `image missing alt: ${imgTag}`);
  }

  for (const buttonTag of getTags(content, "button")) {
    check(
      hasAttr(buttonTag, "type"),
      filePath,
      `button missing explicit type: ${buttonTag}`
    );
  }
};

const lintCss = (filePath, content) => {
  const openingBraces = (content.match(/{/g) || []).length;
  const closingBraces = (content.match(/}/g) || []).length;

  check(
    openingBraces === closingBraces,
    filePath,
    "has mismatched CSS braces"
  );
};

const lintJson = (filePath, content) => {
  try {
    JSON.parse(content);
    rulesRun += 1;
  } catch (error) {
    rulesRun += 1;
    fail(filePath, `invalid JSON: ${error.message}`);
  }
};

const lintJavaScriptSyntax = (filePath) => {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  check(
    result.status === 0,
    filePath,
    `JavaScript syntax check failed:\n${result.stderr.trim()}`
  );
};

const files = collectFiles(repoRoot);

for (const absolutePath of files) {
  const filePath = getRelativePath(absolutePath);
  const content = readFileSync(absolutePath, "utf8");
  const extension = extname(filePath);

  filesChecked += 1;
  lintTextFile(filePath, content);

  if (extension === ".html") {
    lintHtml(filePath, content);
  }

  if (extension === ".css") {
    lintCss(filePath, content);
  }

  if (extension === ".json") {
    lintJson(filePath, content);
  }

  if (extension === ".js" || extension === ".mjs") {
    lintJavaScriptSyntax(filePath);
  }
}

check(
  existsSync(join(repoRoot, "package.json")),
  "package.json",
  "package.json is required for CI lint/test commands"
);

if (failures.length > 0) {
  console.error(`Lint failed (${failures.length} issue(s)):\n`);

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(`Lint passed (${rulesRun} checks across ${filesChecked} files).`);
