// Fixed, non-editable brand rules for the image prompt (spec §5).
const RULES = `STRICT RULES:
- The ONLY text allowed in the whole image is the text inside the panel, written exactly as given, with correctly connected Arabic letters and no typos.
- No logo, no brand name, no phone number, no website, no watermark, no AI-tool symbol or sparkle icon anywhere.
- Medical accuracy if medical staff appear: green uniform, blue disposable gloves, tourniquet on upper arm, blood drawn from the inner elbow with a proper needle and tube; correct hand anatomy (five fingers each); no bandage on the outer forearm.
- Respectful tone, nothing graphic or frightening.`

export function validateBullets(bullets) {
  if (Array.isArray(bullets) && bullets.length === 4) return { ok: true }
  const n = Array.isArray(bullets) ? bullets.length : 0
  return { ok: false, message: `لازم 4 نقاط بالظبط في اللوح (الموجود ${n}).` }
}

export function buildImagePrompt({ concept, subject, mood, accent, serviceLine, bullets }) {
  const [b1 = '', b2 = '', b3 = '', b4 = ''] = bullets || []
  return `Create a premium cinematic advertising image, aspect ratio exactly 4:5 portrait (1080x1350), for an Egyptian medical laboratory.

CONCEPT (visual metaphor): ${concept}
SUBJECT: ${subject}
MOOD & LIGHTING: ${mood}; shallow depth of field, ultra-realistic, high-end commercial photography, rich cinematic color grading.
PALETTE: fresh green #39B76E and deep green #1F6B3D as brand accents, plus ${accent}.

LAYOUT:
- Keep the top 25% of the image visually calm and uncluttered (soft background, no important subject details there) because a logo and headline will be added later.
- In the lower third, place ONE rounded frosted-glass panel, semi-transparent, with white Arabic text, right-to-left, centered:
  Line 1 (larger, bold): "${serviceLine}"
  Bullet points (smaller, white), two rows of two:
  "▪ ${b1}   ▪ ${b2}"
  "▪ ${b3}   ▪ ${b4}"
- Keep the bottom 14% of the image completely clear (plain soft dark gradient, no text, no objects, no subject) for a contact bar I will add later.

${RULES}`
}
