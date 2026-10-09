function absoluteUrl(path, site) {
  return new URL(path, `${site.url}/`).href;
}

// Escape HTML-sensitive characters so metadata cannot terminate the script tag.
function jsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function structuredData(data, site) {
  const url = absoluteUrl(data.url, site);
  const home = absoluteUrl("/", site);
  const personId = `${home}#person`;
  const websiteId = `${home}#website`;
  const pageId = `${url}#webpage`;
  const isArticle = data.ogType === "article";
  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: home,
      name: site.name,
      inLanguage: "en",
      publisher: { "@id": personId },
    },
    {
      "@type": "Person",
      "@id": personId,
      name: site.name,
      url: absoluteUrl("/about/", site),
      jobTitle: site.jobTitle,
      description: site.description,
      sameAs: site.profiles,
    },
    {
      "@type": data.url === "/about/" ? "ProfilePage" :
        data.url === "/articles/" ? "CollectionPage" : "WebPage",
      "@id": pageId,
      url,
      name: data.title,
      description: data.description,
      inLanguage: "en",
      isPartOf: { "@id": websiteId },
      ...(data.url === "/about/" ? { mainEntity: { "@id": personId } } : {}),
      ...(isArticle ? { mainEntity: { "@id": `${url}#article` } } : {}),
    },
  ];

  if (isArticle) {
    graph.push({
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      url,
      headline: data.title,
      description: data.description,
      datePublished: new Date(data.date).toISOString().split("T")[0],
      ...(data.updated ? { dateModified: new Date(data.updated).toISOString().split("T")[0] } : {}),
      author: { "@id": personId },
      publisher: { "@id": personId },
      mainEntityOfPage: { "@id": pageId },
      inLanguage: "en",
      ...(data.ogImage ? { image: absoluteUrl(data.ogImage, site) } : {}),
    });
  }

  if (data.url !== "/") {
    const items = [{ name: "Home", item: home }];
    if (isArticle) items.push({ name: "Articles", item: absoluteUrl("/articles/", site) });
    items.push({ name: isArticle ? data.title : data.url === "/about/" ? "About" : "Articles", item: url });
    const breadcrumbId = `${url}#breadcrumbs`;
    graph[2].breadcrumb = { "@id": breadcrumbId };
    graph.push({
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...item,
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

module.exports = { absoluteUrl, jsonLd, structuredData };
