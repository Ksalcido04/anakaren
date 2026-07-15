# anakaren

Config-driven landing page template for makeup artist clients. Edit `site.config.json`, add images to `assets/`, build, and deploy to Vercel.

## Quick start

```bash
npm run build
npx serve dist
```

Open the local URL to preview the site.

## New client checklist

1. Copy `site.config.example.json` to `site.config.json` (or edit the existing file).
2. Fill in brand, contact, services, booking URL, and social links.
3. Add images to `assets/` (hero portrait, about photo, portfolio shots).
4. Reference images in config as `"hero.jpg"` or `"assets/hero.jpg"`.
5. Run `npm run build` and verify `dist/index.html`.
6. Deploy to Vercel (see below).
7. Add the client's custom domain in Vercel project settings.

## Config reference

All page content lives in `site.config.json`. The build script injects values into `templates/index.html` and copies `assets/` into `dist/assets/`.

Key sections: `meta`, `brand`, `theme.colors`, `hero`, `about`, `services`, `portfolio`, `testimonial`, `booking`, `contact`, `social`, `footer`.

See `site.config.example.json` for the full schema with generic placeholder values.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Vercel reads `vercel.json` automatically:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Deploy. Each push to the connected branch triggers a new build.

### Custom domain

1. In the Vercel project, go to **Settings → Domains**.
2. Add the client's domain (e.g. `www.example.com`).
3. At the domain registrar, add the DNS records Vercel shows (typically a CNAME for `www` or A records for apex).
4. Wait for DNS propagation; Vercel provisions SSL automatically.

Docs: [Vercel custom domains](https://vercel.com/docs/projects/domains)

## Using the Cursor rule

This repo includes a Fable 5-tuned Cursor rule in `.cursor/rules/fable5-client-setup.mdc`.

At the start of a client session, paste a **Client Brief** with business name, domain, Calendly URL, contact info, services, and image paths. Use the **Claude Fable 5** model in Cursor for best results.

The agent will update `site.config.json`, place assets, run the build, and outline deploy/domain steps.

## Project structure

```
site.config.json          Active client config
site.config.example.json  Documented template
templates/index.html      HTML/CSS template (do not put client content here)
scripts/build.mjs         Config → dist/index.html
assets/                   Client images
dist/                     Build output (gitignored)
vercel.json               Vercel build settings
.cursor/rules/            Cursor agent rules
```
