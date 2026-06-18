# Audit Checklist for `get-fit.html`

- [ ] **General Structure:**
  - [ ] HTML document is valid.
  - [ ] `<html lang="en" class="no-js">` tag exists.

- [ ] **Head Section:**
  - [ ] `<meta charset="UTF-8">` is present.
  - [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` is present.
  - [ ] Title (`<title>Get Fit | Justin Chill</title>`) is descriptive and relevant.
  - [ ] Meta description (`<meta name="description" content="Get fit not fat.">`) is accurate.
  - [ ] Meta author (`<meta name="author" content="Justin Chill">`) is correct.
  - [ ] OpenGraph tags are present (e.g., `og:locale`, `og:image`, etc.).

- [ ] **Navigation:** 
  - [ ] Navigation bar (`<nav class="nav" role="navigation">`) has proper structure.
  - [ ] Links in the navigation bar are valid and functional (e.g., internal pages, external links like LinkedIn).
  - [ ] Accessibility attributes (like `aria-label`) are added to improve web accessibility.

- [ ] **Main Content:**
  - [ ] `<main>` tag wraps around the main content section.
  - [ ] Article structure is clear with categories, titles, subtitles, and images.
  - [ ] Paragraphs (`<p>`) have correct spacing and readability.
  
- [ ] **Interactivity:**
  - [ ] Radio buttons (`<input type="radio" id="fat" name="fatfit">` and `<input type="radio" id="fit" name="fatfit">`) are present in appropriate sections.
  - [ ] Labels for radio buttons are accessible (e.g., `for` attribute matches input IDs).
  - [ ] Image is properly linked (`<img src="imgs/GoldsGymAdvert.jpg" loading="lazy" alt="Gold's Gym advert fat to fit.">`) with correct `alt` text.

- [ ] **Footer:**
  - [ ] Footer contains copyright information (e.g., `Justin Chill &copy; 2026`).
  - [ ] Source code link in the footer is valid and functional (`https://github.com/JustinChill/JustinChill.github.io`).

- [ ] **Performance:**
  - [ ] Ensuring that inline styles and scripts are properly organized and maintain consistent formatting.
  - [ ] Lazy loading is implemented correctly for images using `loading="lazy"` attribute.

- [ ] **Accessibility:**
  - [ ] Proper use of semantic HTML tags (e.g., `<main>`, `<section>`).
  - [ ] Appropriate use of alt text for images (e.g., no empty or generic alt text).