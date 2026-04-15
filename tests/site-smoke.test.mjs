import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const expectedPages = [
  "index.html",
  "about.html",
  "what-we-do.html",
  "contact.html",
  "vedant-tyagi.html",
  "nandit-shah.html",
  "dyashothan-suresh-kumar.html",
];

let checksRun = 0;
const failures = [];

const check = (condition, message) => {
  checksRun += 1;

  if (!condition) {
    failures.push(message);
  }
};

const readProjectFile = (filePath) =>
  readFileSync(join(repoRoot, filePath), "utf8");

const getAttrValues = (html, tagName, attrName) => {
  const values = [];
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\s${attrName}\\s*=\\s*(["'])(.*?)\\1`,
    "gi"
  );

  for (const match of html.matchAll(pattern)) {
    values.push(match[2]);
  }

  return values;
};

const getAnyAttrValues = (html, attrName) => {
  const values = [];
  const pattern = new RegExp(`\\b${attrName}\\s*=\\s*(["'])(.*?)\\1`, "gi");

  for (const match of html.matchAll(pattern)) {
    values.push(match[2]);
  }

  return values;
};

const isLocalUrl = (value) => {
  const lowerValue = value.trim().toLowerCase();

  return (
    lowerValue &&
    !lowerValue.startsWith("#") &&
    !lowerValue.startsWith("http://") &&
    !lowerValue.startsWith("https://") &&
    !lowerValue.startsWith("//") &&
    !lowerValue.startsWith("mailto:") &&
    !lowerValue.startsWith("tel:") &&
    !lowerValue.startsWith("data:") &&
    !lowerValue.startsWith("javascript:")
  );
};

const decodeUrlPart = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const splitLocalReference = (value, sourceFile) => {
  const [pathAndQuery, rawHash = ""] = value.split("#");
  const [rawPath = ""] = pathAndQuery.split("?");
  const filePath = decodeUrlPart(rawPath) || sourceFile;
  const hash = decodeUrlPart(rawHash);
  const absolutePath = normalize(join(repoRoot, dirname(sourceFile), filePath));
  const rootRelativePath = relative(repoRoot, absolutePath);

  return { absolutePath, hash, rootRelativePath };
};

const isInsideRepo = (absolutePath) => {
  const rootRelativePath = relative(repoRoot, absolutePath);

  return (
    rootRelativePath === "" ||
    (!rootRelativePath.startsWith("..") && !isAbsolute(rootRelativePath))
  );
};

const hasAnchor = (html, hash) => {
  const escapedHash = hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const anchorPattern = new RegExp(`\\b(?:id|name)=["']${escapedHash}["']`);

  return anchorPattern.test(html);
};

const getCssVar = (css, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedName}\\s*:\\s*([^;]+);`));

  return match ? match[1].trim() : "";
};

const parseVh = (value) => {
  const match = value.match(/^([0-9.]+)vh$/);

  return match ? Number.parseFloat(match[1]) : Number.NaN;
};

const htmlFiles = readdirSync(repoRoot)
  .filter((fileName) => fileName.endsWith(".html"))
  .sort();

for (const expectedPage of expectedPages) {
  check(htmlFiles.includes(expectedPage), `${expectedPage} is missing`);
}

const htmlByFile = new Map(
  htmlFiles.map((fileName) => [fileName, readProjectFile(fileName)])
);

for (const [fileName, html] of htmlByFile) {
  check(
    /^<!doctype html>/i.test(html.trimStart()),
    `${fileName} should start with a doctype`
  );
  check(/<title>[^<]+<\/title>/i.test(html), `${fileName} needs a title`);
  check(
    getAttrValues(html, "link", "href").some((href) =>
      /^styles\.css\?v=[A-Za-z0-9._-]+$/.test(href)
    ),
    `${fileName} should include cache-busted styles.css`
  );
  check(
    getAttrValues(html, "script", "src").some((src) =>
      /^script\.js\?v=[A-Za-z0-9._-]+$/.test(src)
    ),
    `${fileName} should include cache-busted script.js`
  );
  check(
    html.includes("data-version-toggle"),
    `${fileName} should include the site version toggle`
  );
  check(
    !html.includes("toggle-copy-20260414"),
    `${fileName} still references the old asset cache tag`
  );

  for (const attrName of ["href", "src"]) {
    for (const value of getAnyAttrValues(html, attrName)) {
      if (!isLocalUrl(value)) {
        continue;
      }

      const { absolutePath, hash, rootRelativePath } = splitLocalReference(
        value,
        fileName
      );

      check(
        isInsideRepo(absolutePath),
        `${fileName}: ${attrName}="${value}" points outside the repo`
      );
      check(
        existsSync(absolutePath),
        `${fileName}: ${attrName}="${value}" target is missing`
      );

      if (hash && existsSync(absolutePath) && absolutePath.endsWith(".html")) {
        const targetHtml = readFileSync(absolutePath, "utf8");
        check(
          hasAnchor(targetHtml, hash),
          `${fileName}: ${attrName}="${value}" references missing #${hash} in ${rootRelativePath}`
        );
      }
    }
  }
}

const styles = readProjectFile("styles.css");
const scrollSpeed = Number.parseFloat(getCssVar(styles, "--site-scroll-speed"));
const introScrollHeight = parseVh(getCssVar(styles, "--intro-scroll-height"));
const introScrollHeightMobile = parseVh(
  getCssVar(styles, "--intro-scroll-height-mobile")
);

check(
  scrollSpeed > 0 && scrollSpeed <= 4,
  "--site-scroll-speed should be positive and no higher than 4"
);
check(
  Number.isFinite(introScrollHeight) && introScrollHeight >= 200,
  "--intro-scroll-height should be at least 200vh"
);
check(
  Number.isFinite(introScrollHeightMobile) && introScrollHeightMobile >= 180,
  "--intro-scroll-height-mobile should be at least 180vh"
);
check(
  styles.includes("height: var(--intro-scroll-height);"),
  ".intro should use --intro-scroll-height"
);
check(
  styles.includes("height: var(--intro-scroll-height-mobile);"),
  "mobile .intro should use --intro-scroll-height-mobile"
);

const script = readProjectFile("script.js");
check(
  script.includes("--site-scroll-speed") &&
    script.includes("setupSlowerWheelScroll"),
  "script.js should wire the configurable wheel scroll speed"
);

const referencedScripts = new Set(
  [...htmlByFile.values()]
    .flatMap((html) => getAttrValues(html, "script", "src"))
    .filter(isLocalUrl)
    .map((src) => splitLocalReference(src, "index.html").rootRelativePath)
);

for (const scriptPath of referencedScripts) {
  const result = spawnSync(process.execPath, ["--check", scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  check(
    result.status === 0,
    `${scriptPath} has a JavaScript syntax error:\n${result.stderr.trim()}`
  );
}

if (failures.length > 0) {
  console.error(`Site smoke tests failed (${failures.length} failure(s)):\n`);

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Site smoke tests passed (${checksRun} checks across ${htmlFiles.length} pages).`
);
