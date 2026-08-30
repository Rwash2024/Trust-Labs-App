import { FlaskIcon } from './icons'

// Cycled backgrounds standing in for real photography until an image is uploaded from Admin.
const bannerGradients = [
  'linear-gradient(135deg, #2F8F52 0%, #3CAF64 100%)',
  'linear-gradient(135deg, #1F6B3D 0%, #3CAF64 100%)',
  'linear-gradient(135deg, #3CAF64 0%, #7CE3A6 100%)',
  'linear-gradient(135deg, #245C39 0%, #4FBE79 100%)',
  'linear-gradient(135deg, #39B76E 0%, #1F6B3D 100%)',
]

export default function BannerCard({ cardRef, index, image, name, price, onClick }) {
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
          {price.toLocaleString('en-US')}
          <small>جنيه</small>
        </span>
      </span>
    </button>
  )
}
