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
  return `:root{
    --ivory:${colors.ivory};
    --blush:${colors.blush};
    --plum:${colors.plum};
    --gold:${colors.gold};
    --charcoal:${colors.charcoal};
    --rose:${colors.rose};
    --line: rgba(${plumRgb},0.15);
  }`;
}

function buildAboutParagraphs(paragraphs) {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n    ');
}

function buildServicesHtml(items) {
  return items
    .map(
      (item) => `      <div class="service-card">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="price">${item.price}</span>
        <p>${escapeHtml(item.description)}</p>
      </div>`
    )
    .join('\n');
}

const gradientClasses = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

function buildPortfolioHtml(items) {
  return items
    .map((item, index) => {
      const gradientClass = gradientClasses[index % gradientClasses.length];
      const imagePath = resolveAssetPath(item.image);
      const hasImage = Boolean(imagePath);
      const imageHtml = hasImage
        ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(item.label)}" class="gallery-photo">`
        : '';
      return `      <div class="gallery-item ${gradientClass}${hasImage ? ' has-image' : ''}">${imageHtml}<span>${escapeHtml(item.label)}</span></div>`;
    })
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
    '{{HERO_EYEBROW}}': escapeHtml(config.hero.eyebrow),
    '{{HERO_HEADLINE}}': escapeHtml(config.hero.headline),
    '{{HERO_HEADLINE_EMPHASIS}}': escapeHtml(config.hero.headlineEmphasis),
    '{{HERO_HEADLINE_SUFFIX}}': escapeHtml(config.hero.headlineSuffix),
    '{{HERO_LEDE}}': escapeHtml(config.hero.lede),
    '{{HERO_CTA_PRIMARY}}': escapeHtml(config.hero.ctaPrimary),
    '{{HERO_CTA_SECONDARY}}': escapeHtml(config.hero.ctaSecondary),
    '{{HERO_VISUAL}}': buildVisualBlock(config.hero.image, 'replace with your portrait', 'hero-visual'),
    '{{ABOUT_EYEBROW}}': escapeHtml(config.about.eyebrow),
    '{{ABOUT_HEADING}}': escapeHtml(config.about.heading),
    '{{ABOUT_PARAGRAPHS}}': buildAboutParagraphs(config.about.paragraphs),
    '{{ABOUT_VISUAL}}': buildVisualBlock(config.about.image, 'studio photo goes here', 'about-visual'),
    '{{SERVICES_EYEBROW}}': escapeHtml(config.services.eyebrow),
    '{{SERVICES_HEADING}}': escapeHtml(config.services.heading),
    '{{SERVICES_HTML}}': buildServicesHtml(config.services.items),
    '{{PORTFOLIO_EYEBROW}}': escapeHtml(config.portfolio.eyebrow),
    '{{PORTFOLIO_HEADING}}': escapeHtml(config.portfolio.heading),
    '{{PORTFOLIO_HTML}}': buildPortfolioHtml(config.portfolio.items),
    '{{PORTFOLIO_NOTE}}': escapeHtml(config.portfolio.note),
    '{{TESTIMONIAL_QUOTE}}': escapeHtml(config.testimonial.quote),
    '{{TESTIMONIAL_CITE}}': escapeHtml(config.testimonial.cite),
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
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const distDir = join(root, 'dist');

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

const html = buildHtml(config);
writeFileSync(join(distDir, 'index.html'), html, 'utf8');
copyAssets(distDir);

console.log('Built dist/index.html');
