# Portfolio — "Stained Glass Light"

A dark, quiet portfolio where each project is a generated stained-glass window. Built with [Astro](https://astro.build) (static output, almost no JS) and [Lenis](https://lenis.darkroom.engineering) for smooth scrolling.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to dist/
npm run preview   # serve the built site
```

## Make it yours

| What                          | Where                     |
| ----------------------------- | ------------------------- |
| Name, tagline, bio, skills, email, socials, footer motto | `src/data/site.ts` |
| Projects (title, blurb, description, tags, links, colour) | `src/data/projects.ts` |
| Live domain (for link previews) | `astro.config.mjs` → `site` |
| Colours, fonts, spacing       | `src/styles/global.css` (`:root` tokens) |

Each project's window is generated from its `slug`, so changing the slug changes the pattern. `hue` picks the glass colour: `ruby`, `sapphire`, `emerald`, `amber`, or `amethyst`.

If you link to `/resume.pdf`, drop the file in `public/`.

## Deploy

Live at **https://www.henryacooper.com** (henryacooper.com redirects there), hosted on Vercel and deployed from GitHub.

- Every push to `main` triggers a new deploy automatically.
- The domain is registered at Porkbun. Its DNS records point to Vercel; use the exact values shown under Vercel → Project → Settings → Domains.
- Never commit the original resume in the project root (it has a home address and phone). It's git-ignored; the public copy lives in `public/resume.pdf`.

## Notes

- Page transitions use native cross-document View Transitions (Chrome, Edge, Safari 18+). Other browsers just navigate normally.
- `prefers-reduced-motion` turns off smooth scroll, rotation, and reveal animations.
