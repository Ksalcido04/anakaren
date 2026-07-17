import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function resolveAssetPath(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const normalized = imagePath.replace(/^assets\//, '');
  return `assets/${normalized}`;
}

function buildThemeCss(colors) {
  const plumRgb = hexToRgb(colors.plum);
  const ivoryRgb = hexToRgb(colors.ivory);
  return `:root{
    --ivory:${colors.ivory};
    --blush:${colors.blush};
    --plum:${colors.plum};
    --gold:${colors.gold};
    --charcoal:${colors.charcoal};
    --rose:${colors.rose};
    --line: rgba(${plumRgb},0.15);
    --line-light: rgba(${ivoryRgb},0.18);
    --overlay: rgba(${plumRgb},0.55);
    --surface-dark:${colors.plum};
    --plum-rgb:${plumRgb};
    --ivory-rgb:${ivoryRgb};
  }`;
}

// Maps pre-revamp config shapes (flat hero, single testimonial, flat
// portfolio items, no nav) onto the current schema so old client configs
// still build.
function migrateLegacyConfig(config) {
  if (!config.hero.slides) {
    const h = config.hero;
    config.hero = {
      slides: [
        {
          eyebrow: h.eyebrow,
          headline: h.headline,
          headlineEmphasis: h.headlineEmphasis,
          headlineSuffix: h.headlineSuffix,
          lede: h.lede,
          ctaPrimary: h.ctaPrimary,
          ctaHref: '#book',
          image: h.image || '',
        },
      ],
    };
  }
  if (!config.testimonials) {
    const t = config.testimonial || { quote: '', cite: '' };
    config.testimonials = { eyebrow: 'Testimonials', heading: 'What clients say', items: [t] };
  }
  if (!config.portfolio.categories) {
    config.portfolio.categories = [
      { id: 'all', label: 'All work', items: config.portfolio.items || [] },
    ];
  }
  if (!config.nav) {
    config.nav = {
      ctaLabel: 'Book now',
      servicesLinks: config.services.items.map((item) => ({
        label: item.title,
        href: `#service-${slugify(item.title)}`,
      })),
      portfolioLinks: config.portfolio.categories.map((cat) => ({
        label: cat.label,
        href: `#portfolio-${cat.id}`,
      })),
    };
  }
  if (!config.features) config.features = { heading: '', items: [] };
  if (!config.experience) {
    config.experience = { eyebrow: '', heading: '', text: '', highlights: [] };
  }
  if (!config.blog) config.blog = { eyebrow: '', heading: '', items: [] };
  return config;
}

function buildNavLinks(links) {
  return links
    .map(
      (link) =>
        `            <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
    )
    .join('\n');
}

function buildHeroSlides(slides) {
  return slides
    .map((slide, index) => {
      const imagePath = resolveAssetPath(slide.image);
      const media = imagePath
        ? `<img class="hero-media" src="${escapeHtml(imagePath)}" alt="">`
        : '';
      const gradientClass = ` hg${(index % 3) + 1}`;
      const headingTag = index === 0 ? 'h1' : 'h2';
      return `    <div class="hero-slide${index === 0 ? ' is-active' : ''}${imagePath ? ' has-image' : gradientClass}" data-hero-slide>
      ${media}<div class="hero-overlay"></div>
      <div class="wrap hero-content">
        <p class="eyebrow">${escapeHtml(slide.eyebrow)}</p>
        <${headingTag} class="hero-headline">${escapeHtml(slide.headline)} <em>${escapeHtml(slide.headlineEmphasis)}</em>${escapeHtml(slide.headlineSuffix)}</${headingTag}>
        <p class="lede">${escapeHtml(slide.lede)}</p>
        <div class="hero-ctas">
          <a href="${escapeHtml(slide.ctaHref)}" class="btn-primary">${escapeHtml(slide.ctaPrimary)}</a>
        </div>
      </div>
    </div>`;
    })
    .join('\n');
}

function buildHeroDots(slides) {
  return slides
    .map(
      (_, index) =>
        `      <button type="button" class="hero-dot${index === 0 ? ' is-active' : ''}" data-hero-dot="${index}" aria-label="Go to slide ${index + 1}"></button>`
    )
    .join('\n');
}

function buildAboutParagraphs(paragraphs) {
  return paragraphs.map((p) => `      <p>${escapeHtml(p)}</p>`).join('\n');
}

function buildFeaturesHtml(items) {
  return items
    .map(
      (item) => `      <div class="feature" data-reveal>
        <span class="feature-rule"></span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>`
    )
    .join('\n');
}

function buildExperienceHighlights(highlights) {
  return highlights
    .map((text) => `        <li>${escapeHtml(text)}</li>`)
    .join('\n');
}

const serviceGradients = ['sg1', 'sg2', 'sg3', 'sg4', 'sg5', 'sg6'];

function buildServiceCardsHtml(items) {
  return items
    .map((item, index) => {
      const id = `service-${slugify(item.title)}`;
      const imagePath = resolveAssetPath(item.image);
      const gradientClass = serviceGradients[index % serviceGradients.length];
      const media = imagePath
        ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(item.title)}">`
        : '';
      return `      <article class="service-card" id="${id}" data-reveal>
        <div class="service-media ${gradientClass}${imagePath ? ' has-image' : ''}">${media}</div>
        <div class="service-body">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="price">${item.price}</span>
          <p>${escapeHtml(item.description)}</p>
          <a href="#book" class="text-link">${escapeHtml(item.ctaLabel || 'Book Me')}</a>
        </div>
      </article>`;
    })
    .join('\n');
}

function buildPortfolioTabs(categories) {
  return categories
    .map(
      (cat, index) =>
        `      <button type="button" class="portfolio-tab${index === 0 ? ' is-active' : ''}" data-portfolio-tab="portfolio-${escapeHtml(cat.id)}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}">${escapeHtml(cat.label)}</button>`
    )
    .join('\n');
}

const galleryGradients = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

function buildPortfolioPanels(categories) {
  return categories
    .map((cat, catIndex) => {
      const tiles = cat.items
        .map((item, index) => {
          const gradientClass = galleryGradients[index % galleryGradients.length];
          const imagePath = resolveAssetPath(item.image);
          const hasImage = Boolean(imagePath);
          const imageHtml = hasImage
            ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(item.label)}" class="gallery-photo">`
            : '';
          return `        <div class="gallery-item ${gradientClass}${hasImage ? ' has-image' : ''}" data-reveal>${imageHtml}<span>${escapeHtml(item.label)}</span></div>`;
        })
        .join('\n');
      return `    <div class="portfolio-panel${catIndex === 0 ? ' is-active' : ''}" id="portfolio-${escapeHtml(cat.id)}" role="tabpanel">
      <div class="gallery-grid">
${tiles}
      </div>
    </div>`;
    })
    .join('\n');
}

function buildTestimonialsHtml(items) {
  return items
    .map(
      (item, index) => `      <figure class="testimonial-slide${index === 0 ? ' is-active' : ''}" data-testimonial-slide>
        <blockquote>&ldquo;${escapeHtml(item.quote)}&rdquo;</blockquote>
        <figcaption>${escapeHtml(item.cite)}</figcaption>
      </figure>`
    )
    .join('\n');
}

function buildTestimonialDots(items) {
  return items
    .map(
      (_, index) =>
        `      <button type="button" class="carousel-dot${index === 0 ? ' is-active' : ''}" data-testimonial-dot="${index}" aria-label="Go to testimonial ${index + 1}"></button>`
    )
    .join('\n');
}

function buildBlogHtml(items) {
  return items
    .map(
      (item) => `      <article class="blog-card" data-reveal>
        <p class="blog-date">${escapeHtml(item.date)}</p>
        <h3><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.excerpt)}</p>
        <a href="${escapeHtml(item.href)}" class="text-link">Read more</a>
      </article>`
    )
    .join('\n');
}

function buildSocialLink(label, url) {
  if (!url) {
    return `          <li><a href="#" aria-disabled="true">${label}</a></li>`;
  }
  return `          <li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a></li>`;
}

function buildVisualBlock(imagePath, placeholderText, blockClass) {
  const resolved = resolveAssetPath(imagePath);
  if (resolved) {
    return `<div class="${blockClass} has-image"><img src="${escapeHtml(resolved)}" alt=""></div>`;
  }
  return `<div class="${blockClass}" data-placeholder="${escapeHtml(placeholderText)}"></div>`;
}

function buildHtml(config) {
  const templatePath = join(root, 'templates', 'index.html');
  let html = readFileSync(templatePath, 'utf8');
  const { colors } = config.theme;

  const replacements = {
    '{{THEME_CSS}}': buildThemeCss(colors),
    '{{META_TITLE}}': escapeHtml(config.meta.title),
    '{{META_DESCRIPTION}}': escapeHtml(config.meta.description),
    '{{BRAND_NAME}}': escapeHtml(config.brand.name),
    '{{BRAND_TAGLINE}}': escapeHtml(config.brand.tagline),
    '{{NAV_CTA_LABEL}}': escapeHtml(config.nav.ctaLabel),
    '{{NAV_SERVICES_LINKS}}': buildNavLinks(config.nav.servicesLinks),
    '{{NAV_PORTFOLIO_LINKS}}': buildNavLinks(config.nav.portfolioLinks),
    '{{HERO_SLIDES}}': buildHeroSlides(config.hero.slides),
    '{{HERO_DOTS}}': buildHeroDots(config.hero.slides),
    '{{ABOUT_EYEBROW}}': escapeHtml(config.about.eyebrow),
    '{{ABOUT_HEADING}}': escapeHtml(config.about.heading),
    '{{ABOUT_PARAGRAPHS}}': buildAboutParagraphs(config.about.paragraphs),
    '{{ABOUT_VISUAL}}': buildVisualBlock(config.about.image, 'studio photo goes here', 'about-visual'),
    '{{FEATURES_HEADING}}': escapeHtml(config.features.heading),
    '{{FEATURES_HTML}}': buildFeaturesHtml(config.features.items),
    '{{EXPERIENCE_EYEBROW}}': escapeHtml(config.experience.eyebrow),
    '{{EXPERIENCE_HEADING}}': escapeHtml(config.experience.heading),
    '{{EXPERIENCE_TEXT}}': escapeHtml(config.experience.text),
    '{{EXPERIENCE_HIGHLIGHTS}}': buildExperienceHighlights(config.experience.highlights),
    '{{SERVICES_EYEBROW}}': escapeHtml(config.services.eyebrow),
    '{{SERVICES_HEADING}}': escapeHtml(config.services.heading),
    '{{SERVICES_HTML}}': buildServiceCardsHtml(config.services.items),
    '{{PORTFOLIO_EYEBROW}}': escapeHtml(config.portfolio.eyebrow),
    '{{PORTFOLIO_HEADING}}': escapeHtml(config.portfolio.heading),
    '{{PORTFOLIO_TABS}}': buildPortfolioTabs(config.portfolio.categories),
    '{{PORTFOLIO_PANELS}}': buildPortfolioPanels(config.portfolio.categories),
    '{{PORTFOLIO_NOTE}}': escapeHtml(config.portfolio.note),
    '{{TESTIMONIALS_EYEBROW}}': escapeHtml(config.testimonials.eyebrow),
    '{{TESTIMONIALS_HEADING}}': escapeHtml(config.testimonials.heading),
    '{{TESTIMONIALS_HTML}}': buildTestimonialsHtml(config.testimonials.items),
    '{{TESTIMONIALS_DOTS}}': buildTestimonialDots(config.testimonials.items),
    '{{BLOG_EYEBROW}}': escapeHtml(config.blog.eyebrow),
    '{{BLOG_HEADING}}': escapeHtml(config.blog.heading),
    '{{BLOG_HTML}}': buildBlogHtml(config.blog.items),
    '{{BOOKING_HEADING}}': escapeHtml(config.booking.heading),
    '{{BOOKING_TEXT}}': escapeHtml(config.booking.text),
    '{{BOOKING_CALENDLY_URL}}': escapeHtml(config.booking.calendlyUrl),
    '{{BOOKING_CTA_LABEL}}': escapeHtml(config.booking.ctaLabel),
    '{{CONTACT_EMAIL}}': escapeHtml(config.contact.email),
    '{{CONTACT_PHONE}}': escapeHtml(config.contact.phone),
    '{{CONTACT_LOCATION}}': escapeHtml(config.contact.location),
    '{{SOCIAL_INSTAGRAM}}': buildSocialLink('Instagram', config.social.instagram),
    '{{SOCIAL_PINTEREST}}': buildSocialLink('Pinterest', config.social.pinterest),
    '{{SOCIAL_TIKTOK}}': buildSocialLink('TikTok', config.social.tiktok),
    '{{FOOTER_LOCATION_BLURB}}': escapeHtml(config.footer.locationBlurb),
    '{{FOOTER_COPYRIGHT}}': `© ${config.footer.copyrightYear} ${escapeHtml(config.brand.name)} Makeup Artistry. All rights reserved.`,
  };

  for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(value);
  }

  return html;
}

function copyAssets(distDir) {
  const assetsDir = join(root, 'assets');
  const distAssetsDir = join(distDir, 'assets');
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, distAssetsDir, { recursive: true });
  } else {
    mkdirSync(distAssetsDir, { recursive: true });
  }
}

const configPath = join(root, 'site.config.json');
const config = migrateLegacyConfig(JSON.parse(readFileSync(configPath, 'utf8')));
const distDir = join(root, 'dist');

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

const html = buildHtml(config);
writeFileSync(join(distDir, 'index.html'), html, 'utf8');
copyAssets(distDir);

console.log('Built dist/index.html');
