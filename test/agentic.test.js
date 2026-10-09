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

const pages = htmlFiles(output);

test("llms.txt is Markdown with working local links and every published article", () => {
  const text = fs.readFileSync(path.join(output, "llms.txt"), "utf8");
  assert.ok(text.startsWith(`# ${site.name}\n`));
  assert.ok(text.includes(`> ${site.description}`));
  assert.ok(!text.includes("<html"));
  assert.ok(!/&#(?:\d+|x[\da-f]+);/i.test(text), "Markdown text should not be HTML-escaped");
  const urls = [...text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map((match) => new URL(match[1]));
  for (const url of urls.filter((url) => url.origin === site.url)) {
    const filename = path.join(output, url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname);
    assert.ok(fs.existsSync(filename), `Missing llms.txt target: ${url}`);
    if (url.hash) assert.ok(fs.readFileSync(filename, "utf8").includes(`id="${url.hash.slice(1)}"`));
  }
  for (const filename of pages.filter((filename) => filename.includes(`${path.sep}articles${path.sep}`))) {
    const url = `/${path.relative(output, filename).split(path.sep).join("/")}`.replace(/index\.html$/, "");
    assert.ok(urls.some((link) => link.href === `${site.url}${url}`), `Unlisted article: ${url}`);
  }
});

test("all pages provide stable identity, keyboard navigation and non-blocking fonts", () => {
  for (const filename of pages) {
    const html = fs.readFileSync(filename, "utf8");
    assert.match(html, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
    assert.match(html, /<main id="main-content" tabindex="-1">/);
    assert.ok(html.includes(`<span class="sr-only p-name">${site.name}</span>`));
    assert.match(html, /id="typed-name" aria-hidden="true"/);
    assert.match(html, /<button[^>]+type="button" disabled>Toggle theme<\/button>/);
    assert.match(html, /fonts\.googleapis\.com[^>]+media="print" onload="this.media='all'"/);
    assert.match(html, /download>.*download CV \(PDF\)<\/a>/);
  }
});

test("theme works even when browser storage is denied", () => {
  const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script>(.*?)<\/script>/gs)].map((match) => match[1]);
  const attributes = {};
  let click;
  const toggle = {
    disabled: true,
    setAttribute(name, value) { this[name] = value; },
    addEventListener(event, callback) { if (event === "click") click = callback; },
  };
  const context = {
    document: {
      documentElement: {
        setAttribute(name, value) { attributes[name] = value; },
        getAttribute(name) { return attributes[name] || null; },
      },
      getElementById(id) { return id === "theme-toggle" ? toggle : null; },
    },
    window: { matchMedia() { return { matches: false, addEventListener() {} }; } },
    localStorage: {
      getItem() { throw new Error("Storage denied"); },
      setItem() { throw new Error("Storage denied"); },
    },
  };
  for (const script of scripts) assert.doesNotThrow(() => vm.runInNewContext(script, context));
  assert.equal(toggle.disabled, false);
  assert.equal(toggle["aria-label"], "Switch to light colour scheme");
  assert.doesNotThrow(() => click());
  assert.equal(attributes["data-theme"], "light");
  assert.equal(toggle["aria-label"], "Switch to dark colour scheme");
});

test("saved themes are validated before applying them", () => {
  const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
  const script = html.match(/<script>(.*?)<\/script>/s)[1];
  for (const value of ["dark", "light", "invalid", null]) {
    let applied;
    vm.runInNewContext(script, {
      localStorage: { getItem() { return value; } },
      document: { documentElement: { setAttribute(name, theme) { applied = theme; } } },
    });
    assert.equal(applied, ["dark", "light"].includes(value) ? value : undefined);
  }
});
