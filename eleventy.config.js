const { absoluteUrl, jsonLd, structuredData } = require("./lib/seo");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");

  eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
  eleventyConfig.addFilter("jsonLd", jsonLd);
  eleventyConfig.addFilter("structuredData", structuredData);
  eleventyConfig.addFilter("assetUrl", function (filename) {
    const hash = createHash("sha256").update(readFileSync(path.join(__dirname, filename))).digest("hex").slice(0, 12);
    return `${filename}?v=${hash}`;
  });
  eleventyConfig.addCollection("sitemap", function (collectionApi) {
    return collectionApi.getAll().filter((item) =>
      item.url && item.url.endsWith("/") && item.data.sitemap !== false
    );
  });

  eleventyConfig.addFilter("dateReadable", function (date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
  });

  eleventyConfig.addFilter("dateIso", function (date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split("T")[0];
  });

  eleventyConfig.addFilter("readingTime", function (content) {
    const text = (content || "").replace(/<[^>]+>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
