# The Website Specification — checklist (14 items)

## SEO
- [ ] **robots.txt** _(recommended)_ — A plain-text file at the site root that tells crawlers which paths they may or may not fetch. Standardised in RFC 9309 and supported by every major search engine.
    https://specification.website/spec/seo/robots-txt/
- [ ] **XML sitemaps** _(recommended)_ — An XML file listing the canonical URLs of a site, with optional metadata about when each was last changed. The fastest way to tell a search engine what exists.
    https://specification.website/spec/seo/xml-sitemaps/
- [ ] **Sitemap index files** _(recommended)_ — A sitemap of sitemaps. Used when a site has more than 50,000 URLs or wants to split sitemaps by content type for cleaner reporting.
    https://specification.website/spec/seo/sitemap-index/
- [ ] **Image and video sitemap extensions** _(optional)_ — Optional XML extensions that add image and video metadata to sitemap entries. Useful when media is loaded by JavaScript or hosted on a CDN that crawlers cannot reach by following links.
    https://specification.website/spec/seo/image-sitemaps/
- [ ] **URL structure** _(recommended)_ — URLs are the most stable identifier on the web. Keep them lowercase, hyphenated, descriptive, and shallow. Treat them as a public API for your content.
    https://specification.website/spec/seo/url-structure/
- [ ] **Redirects (301/302/308)** _(required)_ — HTTP redirects send a client from one URL to another. Use 301 or 308 for permanent moves, 302 or 307 for temporary ones, and never chain more than necessary.
    https://specification.website/spec/seo/redirects/
- [ ] **Server-side rendering** _(recommended)_ — Crawlers, social scrapers, and AI agents index the HTML your server returns. Render your primary content and metadata server-side — via SSR, static generation, or prerendering — so it is in the initial response, not assembled later by client-side JavaScript.
    https://specification.website/spec/seo/server-side-rendering/
- [ ] **Soft 404s** _(avoid)_ — A page that looks like a 'not found' message to a user but returns 200 OK to a crawler. Search engines treat soft 404s as a quality problem and often refuse to index them.
    https://specification.website/spec/seo/soft-404/
- [ ] **Meta robots and X-Robots-Tag** _(required)_ — Every page must have an explicit, correct indexing policy — either implicit (default index, follow) on public pages, or an explicit noindex / X-Robots-Tag on staging, admin, thin, or private content. Get this wrong and you either disappear from search or expose what you didn't mean to.
    https://specification.website/spec/seo/meta-robots/
- [ ] **Heading hierarchy** _(required)_ — Headings describe the sections of a page. They must form a nested outline, never be used for visual styling alone, and never skip levels.
    https://specification.website/spec/seo/heading-hierarchy/
- [ ] **Internal linking** _(recommended)_ — Links from one page on a site to another. The strongest signal you control for telling crawlers and AI agents what a page is about and how important it is.
    https://specification.website/spec/seo/internal-linking/
- [ ] **Structured data (JSON-LD)** _(recommended)_ — Machine-readable annotations that describe the content of a page using the schema.org vocabulary. JSON-LD is the format search engines and AI agents expect.
    https://specification.website/spec/seo/structured-data/
- [ ] **Breadcrumbs** _(recommended)_ — A short trail showing the page's position in the site hierarchy. Visible in the UI for users, marked up as BreadcrumbList JSON-LD for search engines.
    https://specification.website/spec/seo/breadcrumbs/
- [ ] **IndexNow** _(optional)_ — An open protocol for telling participating search engines that a URL has changed. One HTTP request pushes Bing, Yandex, Naver, and Seznam to recrawl — Google does not participate.
    https://specification.website/spec/seo/indexnow/