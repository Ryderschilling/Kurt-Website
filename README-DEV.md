# kurtbenkert.com · dev notes

Static site, no build step. Six pages, shared css/js, self-hosted fonts.

## Run it

```
npx serve .
```

Or open index.html with Live Server. Everything is relative paths, works either way.

## Deploy

Repo root = this folder. Vercel picks up vercel.json (cleanUrls on, so /story.html serves as /story, matching the canonicals and sitemap).

## Structure

```
index.html story.html watch.html book.html dime-lab.html contact.html
css/main.css        design system + all sections
js/main.js          nav, reveals, count-ups, spine, lightbox, cursor, HUD
js/gsap.min.js js/ScrollTrigger.min.js js/lenis.min.js   self-hosted libs
fonts/              self-hosted woff2 (Anybody variable, Inter Tight, Plex Mono)
img/                photos (downscaled IG copies, swap for originals before launch)
favicon.svg robots.txt sitemap.xml vercel.json
```

Pages were generated from gen.py templates once; they are plain HTML now, edit directly.

## Before launch (the real TODOs)

1. **Contact email is a placeholder**: mailto hello@kurtbenkert.com on contact.html and nowhere else. Ask Kurt what address he wants, or swap for a FormSubmit form.
2. **Read his Pillar page off his phone** (pillar.io/KurtBenkert) and make sure every link that must survive has a home here.
3. **Photos are downscaled screenshots.** For launch, ask Kurt for originals (or his photographer's exports), convert to AVIF/WebP at 1600w, keep the same filenames.
4. Video picks on watch.html are my curation of his verified top performers. Six are wired with real YouTube IDs. Easy to add more: copy a `.vidtile` block, change the `data-yt` id, title, and tag.
5. Book buy button points at thedimelab.com home. Swap to the exact product URL.
6. Confirm with Kurt: the $-free approach on his page (no revenue figures shown anywhere on the site; chips use units sold only).
7. og:image is the Lambeau shot. Consider a dedicated 1200x630 OG card with the wordmark.

## Rules baked in (do not undo)

Radius 0 everywhere. No serif, no italics. Heroes are photos with directional scrims, never text-shadow. Chalk plays are inline SVG. Lenis is desktop-only. Reveals are IntersectionObserver, play once. Fonts self-hosted, no Google Fonts request. No em-dashes in copy.
