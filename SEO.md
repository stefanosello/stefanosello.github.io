# Google Search setup

The site generates canonical URLs, an XML sitemap, semantic headings, and
JSON-LD for the website, author profile, articles, and visible breadcrumbs.
Run `npm test` to build and check these before publishing; deployment runs the
same checks.

## After deployment

1. Verify the `stefanosello.me` domain in [Google Search Console](https://search.google.com/search-console)
   using the DNS TXT record Google provides. This requires access to your DNS account.
2. Submit `https://stefanosello.me/sitemap.xml` in Search Console's Sitemaps section.
3. Inspect the home, about, and article URLs and request indexing where appropriate.
4. Check the about and article pages with [Google's Rich Results Test](https://search.google.com/test/rich-results).
5. Check [PageSpeed Insights](https://pagespeed.web.dev/) and monitor Search Console's
   indexing, Core Web Vitals, and search performance reports after Google recrawls.
6. In GitHub Pages settings, keep the custom domain set to `stefanosello.me` and
   enable **Enforce HTTPS**. Check that alternate hostnames redirect to the canonical domain.

These changes help discovery and interpretation, but do not guarantee indexing,
rich results, or rankings. Useful original articles and relevant links from other
sites remain important. No analytics or tracking scripts are required.

## Publishing articles

- Use a descriptive, unique `title` and an accurate `description` in front matter.
  Browser/search titles automatically append the author's name.
- The template supplies the H1; start Markdown sections at `##`.
- Set `date` to the real publication date. For substantive revisions, add
  `updated: YYYY-MM-DD`; it appears on the page, in structured data, and in the sitemap.
  Do not change dates on every build just to imply freshness.
- Optionally set `ogImage: /assets/descriptive-filename.jpg` to an existing,
  relevant image. Do not use a placeholder as an article or profile image.
- Keep profile and canonical-domain details in `src/_data/site.json`; update
  `robots.txt` and `CNAME` as well if the domain changes.
