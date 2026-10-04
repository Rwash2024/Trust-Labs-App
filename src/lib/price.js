import brand from '../brand'

// Labs that don't publish a price list set features.showPrices=false in brand.json;
// prices are then replaced by a call-to-confirm label and cart totals are hidden.
export const showPrices = brand.features?.showPrices !== false
export const PRICE_ON_REQUEST = 'السعر عند الحجز'

export function priceText(price) {
  return showPrices && price != null ? `${price.toLocaleString('en-US')} جنيه` : PRICE_ON_REQUEST
}
