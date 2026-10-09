# Privacy maintenance

The site serves JetBrains Mono locally. YouTube players use a local placeholder
and are created only after the visitor chooses **Load YouTube video**, next to
a disclosure of the third-party connection and storage. There is no external
thumbnail. An **Unload YouTube video** button removes the player, and no video
choice is persisted. An outbound link remains available without JavaScript.

Its page code has no analytics, advertising, or third-party resource requests on
initial load. External discovery endpoints (Webmention and IndieAuth) remain
available to clients that choose to use them.

`/privacy/` explains hosting, optional email correspondence, the `theme` preference
in local storage, optional YouTube players, external services, and data rights.
No site-wide consent banner is added; video choices are handled at each player.

## Before publishing

- Review the notice against your actual email handling, retention, and provider
  arrangements. It uses retention criteria, not an invented fixed deletion period.
  Ensure your real practices match these statements; obtain legal review if needed.
- GitHub Pages logs IP addresses for security. Do not describe this site as
  processing no personal data just because its code sets no cookies.
- Keep the notice's `updated` date accurate when privacy practices change.
- Search Console does not require Google Analytics or Tag Manager. Prefer DNS or
  HTML verification, which adds no visitor tracking code.

## Future changes

- Keep fonts, images, scripts, and styles on the same origin. Do not add external
  preconnects, thumbnails, embeds, or analytics without assessing their data flows.
- A privacy-enhanced YouTube domain or lazy loading is not equivalent to blocking
  a third-party resource until valid consent.
- If further non-essential tracking is added, reassess prior consent, withdrawal controls,
  the privacy notice, and any need for a consent banner before shipping it.
- Run `npm test` before publishing. Privacy checks verify local font assets and
  licensing, footer navigation, and the absence of third-party resources before
  an explicit video choice. Review the video disclosure and consent handling as
  part of any legal review; the technical gate alone is not a compliance guarantee.
