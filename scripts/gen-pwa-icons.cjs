const sharp = require('sharp');
const CLIENT = process.env.VITE_CLIENT || 'trustlabs';
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'clients', CLIENT, 'public', 'icons');
const BG_COLOR = '#FFFFFF';
const SRC_MARK = path.join(__dirname, '..', 'scripts', '_icon_mark.png');

fs.mkdirSync(OUT_DIR, { recursive: true });

// A client with a wide mark (e.g. icon + wordmark) can loosen the default padding
// in clients/<name>/icon-config.json: { "padRatio": 0.1, "maskablePadRatio": 0.22 }.
const iconConfigPath = path.join(__dirname, '..', 'clients', CLIENT, 'icon-config.json');
const iconConfig = fs.existsSync(iconConfigPath) ? JSON.parse(fs.readFileSync(iconConfigPath, 'utf8')) : {};

async function buildMark() {
  // A client can ship a ready-made square mark; otherwise crop it from the top of logo-en.png.
  const custom = `clients/${CLIENT}/icon-mark.png`;
  if (fs.existsSync(custom)) {
    await sharp(custom).trim().toFile(SRC_MARK);
    return;
  }
  const meta = await sharp(`clients/${CLIENT}/logo-en.png`).metadata();
  const cropH = Math.round(meta.height * 0.52);
  const top = await sharp(`clients/${CLIENT}/logo-en.png`)
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
    .png()
    .toBuffer();
  const trimmed = await sharp(top).trim().toBuffer();
  await sharp(trimmed).toFile(SRC_MARK);
}

// Square icon: mark centered on a brand-green rounded canvas, with padding
async function makeIcon(size, { maskable = false, filename } = {}) {
  // maskable needs bigger safe-zone padding
  const padRatio = maskable ? (iconConfig.maskablePadRatio ?? 0.32) : (iconConfig.padRatio ?? 0.16)
  const markSize = Math.round(size * (1 - padRatio * 2));
  const mark = await sharp(SRC_MARK)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, filename));
}

async function makeFavicon() {
  // simple 32x32 favicon-style PNG (used via link rel icon)
  await makeIcon(32, { filename: 'favicon-32.png' });
}

(async () => {
  await buildMark();

  await makeIcon(192, { filename: 'icon-192.png' });
  await makeIcon(512, { filename: 'icon-512.png' });
  await makeIcon(192, { maskable: true, filename: 'icon-maskable-192.png' });
  await makeIcon(512, { maskable: true, filename: 'icon-maskable-512.png' });
  await makeIcon(180, { filename: 'apple-touch-icon.png' }); // iOS home screen (no transparency issues, has bg)
  await makeFavicon();

  fs.unlinkSync(SRC_MARK);
  console.log('PWA icons generated in public/icons');
})();
