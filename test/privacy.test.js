const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const site = require("../src/_data/site.json");

const output = path.join(__dirname, "../_site");

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(filename) : filename.endsWith(".html") ? [filename] : [];
  });
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

const pages = htmlFiles(output);

function assertLocalResource(value, source) {
  const url = new URL(value, `${site.url}/`);
  assert.equal(url.origin, site.url, `Third-party resource in ${source}: ${url}`);
  const filename = path.join(output, decodeURIComponent(url.pathname));
  assert.ok(fs.existsSync(filename), `Missing resource in ${source}: ${url}`);
}

test("initial page resources stay on the same origin without embeds, hints, or tracking code", () => {
  const fetchingLinkRels = new Set(["stylesheet", "icon", "preload", "modulepreload", "prefetch", "preconnect", "dns-prefetch", "prerender"]);
  for (const filename of pages) {
    const html = fs.readFileSync(filename, "utf8");
    assert.ok(!/<(?:iframe|embed|object|form)\b/i.test(html), filename);
    for (const match of html.matchAll(/<(?:script|img|source|video|audio|input|link)\b[^>]*>/g)) {
      const tag = match[0];
      const attr = attributes(tag);
      for (const name of ["src", "poster"]) {
        if (attr[name]) assertLocalResource(attr[name], filename);
      }
      if (attr.srcset) {
        for (const item of attr.srcset.split(",")) assertLocalResource(item.trim().split(/\s+/)[0], filename);
      }
      if (tag.startsWith("<link") && (attr.rel || "").split(/\s+/).some((rel) => fetchingLinkRels.has(rel))) {
        assertLocalResource(attr.href, filename);
      }
    }
    for (const script of html.matchAll(/<script>(.*?)<\/script>/gs)) {
      assert.ok(!/document\.cookie|\bfetch\s*\(|XMLHttpRequest|sendBeacon|\bgtag\s*\(/.test(script[1]), filename);
      const storageKeys = [...script[1].matchAll(/localStorage\.(?:getItem|setItem)\('([^']+)'/g)].map((match) => match[1]);
      assert.ok(storageKeys.every((key) => key === "theme"), filename);
    }
    for (const match of html.matchAll(/<a\b[^>]*>/g)) {
      const attr = attributes(match[0]);
      if (attr.target === "_blank") {
        const rel = (attr.rel || "").split(/\s+/);
        assert.ok(rel.includes("noopener") && rel.includes("noreferrer"), filename);
      }
    }
  }
});

test("normal and italic variable fonts are local WOFF2 files with their license", () => {
  const css = fs.readFileSync(path.join(output, "style.css"), "utf8");
  assert.ok(!/@import\b/.test(css));
  for (const resource of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assertLocalResource(resource[1], "style.css");
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((match) => match[1]);
  assert.equal(faces.length, 2);
  for (const style of ["normal", "italic"]) {
    const face = faces.find((item) => item.includes(`font-style: ${style};`));
    assert.ok(face);
    assert.match(face, /font-weight: 100 800;/);
    assert.match(face, /font-display: swap;/);
    const filename = face.match(/url\('([^']+)'\)/)[1];
    const font = fs.readFileSync(path.join(output, filename));
    assert.equal(font.subarray(0, 4).toString(), "wOF2");
    assert.equal(font.readUInt32BE(8), font.length);
    assert.ok(font.length > 1000);
  }
  const license = fs.readFileSync(path.join(output, "assets/fonts/OFL.txt"), "utf8");
  assert.match(license, /Copyright 2020 The JetBrains Mono Project Authors/);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
});

test("privacy notice is linked on every page with a correctly named breadcrumb", () => {
  for (const filename of pages) {
    const html = fs.readFileSync(filename, "utf8");
    assert.match(html, /<footer>[\s\S]*href="\/privacy\/"[^>]*>privacy<\/a>/);
  }
  const html = fs.readFileSync(path.join(output, "privacy/index.html"), "utf8");
  assert.match(html, /aria-current="page">Privacy<\/li>/);
  assert.ok(html.includes(`mailto:${site.email}`));
  for (const heading of ["Browsing and hosting", "Cookies and local storage", "Contact emails", "Google Search Console", "Your rights"]) {
    assert.ok(html.includes(`<h2>${heading}</h2>`));
  }
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const breadcrumb = data["@graph"].find((item) => item["@type"] === "BreadcrumbList");
  assert.equal(breadcrumb.itemListElement.at(-1).name, "Privacy");
  assert.equal(breadcrumb.itemListElement.at(-1).item, `${site.url}/privacy/`);
});

test("the article offers an opt-in video placeholder and a no-JavaScript link", () => {
  const html = fs.readFileSync(path.join(output, "articles/why-i-still-read-the-code/index.html"), "utf8");
  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/watch\?v=3TNpOD6bov8" target="_blank" rel="noopener noreferrer">Watch/);
  assert.ok(!html.includes("youtube-nocookie.com"));
  assert.ok(!html.includes("<iframe"));
  assert.match(html, /data-youtube-id="3TNpOD6bov8"/);
  assert.match(html, /data-video-load[^>]*hidden>Load YouTube video<\/button>/);
  assert.match(html, /data-video-unload hidden>Unload YouTube video<\/button>/);
  assert.match(html, /<script src="\/assets\/youtube\.js\?v=[a-f0-9]{12}" defer><\/script>/);
  assert.match(html, /you consent to connecting to Google\/YouTube/);
  assert.match(html, /href="\/privacy\/#youtube"/);
  assert.match(html, /<noscript>.*YouTube link below.*<\/noscript>/);
});

test("YouTube is created only on an explicit load and removed on withdrawal", () => {
  const script = fs.readFileSync(path.join(output, "assets/youtube.js"), "utf8");
  const listeners = {};
  let focused;
  const load = {
    hidden: true,
    addEventListener(event, callback) { listeners.load = callback; },
    focus() { focused = "load"; },
  };
  const unload = {
    hidden: true,
    addEventListener(event, callback) { listeners.unload = callback; },
  };
  const placeholder = { hidden: false };
  const status = {};
  const children = [];
  const elements = {
    ".video-container": { appendChild(player) { children.push(player); } },
    ".video-placeholder": placeholder,
    "[data-video-load]": load,
    "[data-video-unload]": unload,
    "[data-video-status]": status,
  };
  let created = 0;
  const embed = {
    dataset: { youtubeId: "3TNpOD6bov8", videoTitle: "LGTM music video" },
    querySelector(selector) { return elements[selector]; },
  };
  vm.runInNewContext(script, {
    document: {
      querySelectorAll() { return [embed]; },
      createElement(tag) {
        assert.equal(tag, "iframe");
        created++;
        return {
          focus() { focused = "player"; },
          remove() { children.splice(children.indexOf(this), 1); },
        };
      },
    },
  });
  assert.equal(created, 0);
  assert.equal(load.hidden, false);
  listeners.load();
  assert.equal(created, 1);
  assert.equal(children[0].src, "https://www.youtube-nocookie.com/embed/3TNpOD6bov8");
  assert.equal(children[0].title, "LGTM music video");
  assert.equal(children[0].loading, "eager");
  assert.equal(children[0].referrerPolicy, "strict-origin-when-cross-origin");
  assert.equal(placeholder.hidden, true);
  assert.equal(unload.hidden, false);
  assert.equal(focused, "player");
  listeners.load();
  assert.equal(created, 1, "Repeated clicks must not duplicate the player");
  listeners.unload();
  assert.equal(children.length, 0);
  assert.equal(placeholder.hidden, false);
  assert.equal(unload.hidden, true);
  assert.equal(focused, "load");
  listeners.load();
  assert.equal(created, 2, "Loading again requires another explicit click");
});
