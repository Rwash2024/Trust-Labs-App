import cibLogo from '../assets/partners/cib.svg'
import tmgLogo from '../assets/partners/tmg.png'
import cocaColaLogo from '../assets/partners/cocacola.svg'
import rixosLogo from '../assets/partners/rixos.svg'
import kempinskiLogo from '../assets/partners/kempinski.svg'
import alAhlyLogo from '../assets/partners/alahly.svg'
import zamalekLogo from '../assets/partners/zamalek.svg'
import axaLogo from '../assets/partners/axa.svg'
import wadiDeglaLogo from '../assets/partners/wadidegla.png'
import seoudiLogo from '../assets/partners/seoudi.jpg'
import saydLogo from '../assets/partners/sayd.png'
import shamsLogo from '../assets/partners/shams.png'
import beniSuefLogo from '../assets/partners/beni-suef.png'
import nextCareLogo from '../assets/partners/nextcare.png'
import egyCareLogo from '../assets/partners/egycare.jpg'
import medRightLogo from '../assets/partners/medright.png'
import globeMedLogo from '../assets/partners/globemed.png'
import misrInsuranceLogo from '../assets/partners/misr-insurance.png'

// Grouped by category, one row per group — clubs together, insurance companies together,
// everything else together. Ezz Steel dropped (no reliable official logo found).
const partnerLogosGeneral = [
  { name: 'بنك CIB', src: cibLogo },
  { name: 'مجموعة طلعت مصطفى', src: tmgLogo },
  { name: 'كوكاكولا', src: cocaColaLogo },
  { name: 'سعودي ماركت', src: seoudiLogo },
  { name: 'فنادق ريكسوس', src: rixosLogo },
  { name: 'فنادق كمبينسكي', src: kempinskiLogo },
]

const partnerLogosClubs = [
  { name: 'النادي الأهلي', src: alAhlyLogo },
  { name: 'نادي الزمالك', src: zamalekLogo },
  { name: 'نادي الصيد', src: saydLogo },
  { name: 'نادي الشمس', src: shamsLogo },
  { name: 'نادي وادي دجلة', src: wadiDeglaLogo },
  { name: 'نادي بني سويف العام', src: beniSuefLogo },
]

const partnerLogosInsurance = [
  { name: 'شركة أكسا', src: axaLogo },
  { name: 'شركة نيكست كير', src: nextCareLogo },
  { name: 'شركة ايجي كير', src: egyCareLogo },
  { name: 'شركة ميد رايت', src: medRightLogo },
  { name: 'شركة جلوب ميد', src: globeMedLogo },
  { name: 'مصر للتأمين', src: misrInsuranceLogo },
]

// Static grid fallback, grouped by category order — general partners, then clubs, then
// insurance. Used until the admin adds partners in Admin > شركاء النجاح.
export const staticPartnerLogos = [...partnerLogosGeneral, ...partnerLogosClubs, ...partnerLogosInsurance]
