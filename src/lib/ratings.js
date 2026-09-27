// Shared by the "قيّم زيارتك" page and its admin tab, so both agree on what
// counts as a bad or a so-so visit.
//
// The lowest of the three answers decides, not just the overall one: "overall
// great, staff 😡" is exactly the kind of visit that needs a follow-up.
//   low    (any answer 😡/😞) → phone required, complaint filed automatically
//   medium (lowest answer 😐) → phone optional; we ask what would have made it better
//   good   (all 😊/🤩)
export const LOW_RATING_MAX = 2
export const MEDIUM_RATING = 3

export function lowestScore(scores) {
  const values = scores.filter((v) => typeof v === 'number')
  return values.length ? Math.min(...values) : null
}

export function ratingLevel(scores) {
  const lowest = lowestScore(scores)
  if (lowest === null) return 'good'
  if (lowest <= LOW_RATING_MAX) return 'low'
  if (lowest === MEDIUM_RATING) return 'medium'
  return 'good'
}
