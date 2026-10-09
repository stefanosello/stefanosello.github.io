const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { absoluteUrl, jsonLd, structuredData } = require("../lib/seo");
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

const pages = htmlFiles(output).map((filename) => ({
  filename,
  url: `/${path.relative(output, filename).split(path.sep).join("/")}`.replace(/index\.html$/, ""),
  html: fs.readFileSync(filename, "utf8"),
}));

test("all generated pages have unique search titles and descriptions", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const page of pages) {
    const title = [...page.html.matchAll(/<title>(.*?)<\/title>/gs)];
    assert.equal(title.length, 1, page.url);
    assert.ok(title[0][1].includes(site.name), page.url);
    assert.ok(!titles.has(title[0][1]), `Duplicate title: ${page.url}`);
    titles.add(title[0][1]);
    const metadata = [...page.html.matchAll(/<meta\b[^>]*>/g)].map((match) => attributes(match[0]));
    const description = metadata.filter((item) => item.name === "description");
    assert.equal(description.length, 1, page.url);
    assert.ok(description[0].content.length > 0, page.url);
    assert.ok(!descriptions.has(description[0].content), `Duplicate description: ${page.url}`);
    descriptions.add(description[0].content);
    assert.ok(!metadata.some((item) => item.name === "robots" && /noindex/.test(item.content)), page.url);
  }
});

for (const page of pages) {
  test(`semantic HTML, canonical and structured data: ${page.url}`, () => {
    assert.equal((page.html.match(/<h1\b/g) || []).length, 1);
    assert.equal((page.html.match(/<main\b/g) || []).length, 1);
    assert.match(page.html, /<span id="typed-name" aria-hidden="true">stefano sello<\/span>/);
    const links = [...page.html.matchAll(/<link\b[^>]*>/g)].map((match) => attributes(match[0]));
    const canonical = links.filter((item) => item.rel === "canonical");
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].href, absoluteUrl(page.url, site));
    const metadata = [...page.html.matchAll(/<meta\b[^>]*>/g)].map((match) => attributes(match[0]));
    assert.equal(metadata.find((item) => item.property === "og:url").content, canonical[0].href);
    for (const image of metadata.filter((item) => item.property === "og:image")) {
      const url = new URL(image.content);
      if (url.origin === site.url) assert.ok(fs.existsSync(path.join(output, url.pathname)));
    }

    const scripts = [...page.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.equal(scripts.length, 1);
    const data = JSON.parse(scripts[0][1]);
    assert.equal(data["@context"], "https://schema.org");
    const graph = data["@graph"];
    const person = graph.find((item) => item["@type"] === "Person");
    assert.equal(person.name, site.name);
    assert.equal(person.url, absoluteUrl("/about/", site));
    const webpage = graph.find((item) => ["WebPage", "ProfilePage", "CollectionPage"].includes(item["@type"]));
    assert.equal(webpage.url, canonical[0].href);
    if (page.url === "/about/") {
      assert.equal(webpage["@type"], "ProfilePage");
      assert.equal(webpage.mainEntity["@id"], person["@id"]);
    }
    if (page.url.startsWith("/articles/") && page.url !== "/articles/") {
      const article = graph.find((item) => item["@type"] === "BlogPosting");
      assert.equal(article.url, canonical[0].href);
      assert.equal(article.author["@id"], person["@id"]);
      assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(page.html, /href="\/about\/" rel="author">Stefano Sello<\/a>/);
      for (const iframe of page.html.matchAll(/<iframe\b[^>]*>/g)) {
        assert.equal(attributes(iframe[0]).loading, "lazy");
      }
    }
    if (page.url !== "/") {
      const breadcrumb = graph.find((item) => item["@type"] === "BreadcrumbList");
      assert.equal(breadcrumb.itemListElement.at(-1).item, canonical[0].href);
      assert.match(page.html, /aria-label="Breadcrumb"/);
    }
  });
}

test("sitemap covers each canonical HTML page exactly once", () => {
  const sitemap = fs.readFileSync(path.join(output, "sitemap.xml"), "utf8");
  assert.ok(sitemap.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(urls.sort(), pages.map((page) => absoluteUrl(page.url, site)).sort());
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(fs.readFileSync(path.join(output, "robots.txt"), "utf8").includes(`Sitemap: ${site.url}/sitemap.xml`));
});

test("internal links and local assets point to generated files", () => {
  for (const page of pages) {
    for (const match of page.html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const target = match[1].endsWith("/") ? `${match[1]}index.html` : match[1];
      assert.ok(fs.existsSync(path.join(output, target)), `${page.url}: missing ${target}`);
    }
  }
});

test("each page has a responsive avatar, larger on the homepage", () => {
  for (const page of pages) {
    const avatars = [...page.html.matchAll(/<img\b[^>]*>/g)]
      .map((match) => attributes(match[0]))
      .filter((image) => (image.class || "").split(/\s+/).includes("avatar"));
    assert.equal(avatars.length, 1, page.url);
    const avatar = avatars[0];
    const size = page.url === "/" ? "128" : "64";
    assert.equal(avatar.width, size, page.url);
    assert.equal(avatar.height, size, page.url);
    assert.equal(avatar.sizes, `${size}px`, page.url);
    assert.equal(avatar.class.includes("avatar--home"), page.url === "/");
    assert.ok(avatar.class.split(/\s+/).includes("u-photo"));
    assert.equal(avatar.alt, `Illustrated avatar of ${site.name}`);
    assert.equal(avatar.loading, "eager");
    assert.equal(avatar.decoding, "async");
    if (page.url === "/") assert.equal(avatar.fetchpriority, "high");
    for (const candidate of avatar.srcset.split(",")) {
      const [filename, descriptor] = candidate.trim().split(/\s+/);
      const image = fs.readFileSync(path.join(output, filename));
      assert.equal(image.readUInt16BE(0), 0xffd8, `${filename} must be a JPEG`);
      assert.match(descriptor, /^\d+w$/);
      assert.ok(image.length < 50000, `${filename} should be optimized for avatar display`);
    }
  }
});

test("JSON-LD escapes script delimiters and preserves the original values", () => {
  const value = { headline: "</script><script>alert('x')</script> & \u2028\u2029" };
  const encoded = jsonLd(value);
  assert.ok(!encoded.includes("<"));
  assert.deepEqual(JSON.parse(encoded), value);
});

test("article modification dates and images are only included when supplied", () => {
  const data = { url: "/articles/example/", title: "Example", description: "Example article", ogType: "article", date: "2026-03-04" };
  const article = structuredData(data, site)["@graph"].find((item) => item["@type"] === "BlogPosting");
  assert.ok(!("dateModified" in article));
  assert.ok(!("image" in article));
  const updated = structuredData({ ...data, updated: "2026-10-09", ogImage: "/assets/example.jpg" }, site)["@graph"].find((item) => item["@type"] === "BlogPosting");
  assert.equal(updated.dateModified, "2026-10-09");
  assert.equal(updated.image, `${site.url}/assets/example.jpg`);
});
