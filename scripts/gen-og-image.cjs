const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'og-image.png');
const BG_COLOR = '#FFFFFF';
const WIDTH = 1200;
const HEIGHT = 630;

(async () => {
  const logo = await sharp(path.join(__dirname, '..', 'src', 'assets', 'logo-en.png'))
    .trim()
    .resize({ height: Math.round(HEIGHT * 0.72), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG_COLOR },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(OUT);

  console.log('OG image written to', OUT);
})();
