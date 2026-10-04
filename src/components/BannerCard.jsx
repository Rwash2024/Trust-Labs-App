import { FlaskIcon } from './icons'
import { priceText, showPrices } from '../lib/price'

// Cycled backgrounds standing in for real photography until an image is uploaded from Admin.
const bannerGradients = [
  'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
  'linear-gradient(135deg, var(--color-primary-darker) 0%, var(--color-primary) 100%)',
  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-bright) 100%)',
  'linear-gradient(135deg, var(--color-primary-darker) 0%, var(--color-primary-dark) 100%)',
  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-darker) 100%)',
]

export default function BannerCard({ cardRef, index, image, name, price, currency = 'جنيه', onClick }) {
  return (
    <button
      type="button"
      ref={cardRef}
      className="banner-card"
      style={!image ? { background: bannerGradients[index % bannerGradients.length] } : undefined}
      onClick={onClick}
    >
      {image && <img className="banner-card__img" src={image} alt="" />}
      <span className="banner-card__scrim" />
      <span className="banner-card__icon">
        <FlaskIcon color="#fff" width={18} height={18} />
      </span>
      <span className="banner-card__content">
        <span className="banner-card__name">{name}</span>
        <span className="banner-card__price">
          {showPrices && price != null ? (
            <>
              {price.toLocaleString('en-US')}
              <small>{currency}</small>
            </>
          ) : (
            <small>{priceText(null)}</small>
          )}
        </span>
      </span>
    </button>
  )
}
