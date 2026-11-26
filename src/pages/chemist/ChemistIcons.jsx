// Small inline stroke icons for the chemist screens (decorative: aria-hidden).
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
}

function Svg({ size = 22, className, children }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      {children}
    </svg>
  )
}

export function IconMap(props) {
  return (
    <Svg {...props}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Svg>
  )
}
export function IconPhone(props) {
  return (
    <Svg {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    </Svg>
  )
}
export function IconCar(props) {
  return (
    <Svg {...props}>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v3H3z" />
      <circle cx="7.5" cy="16" r="1.5" />
      <circle cx="16.5" cy="16" r="1.5" />
    </Svg>
  )
}
export function IconCheck(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Svg>
  )
}
export function IconClock(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}
export function IconWarning(props) {
  return (
    <Svg {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </Svg>
  )
}
export function IconSignal(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 7.5a6.5 6.5 0 000 9M16.5 7.5a6.5 6.5 0 010 9M4.5 4.5a11 11 0 000 15M19.5 4.5a11 11 0 010 15" />
    </Svg>
  )
}
export function IconShare(props) {
  return (
    <Svg {...props}>
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
      <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
    </Svg>
  )
}
export function IconTests(props) {
  return (
    <Svg {...props}>
      <path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4a1.5 1.5 0 001.3-2L14 9V3" />
      <path d="M7.5 15h9" />
    </Svg>
  )
}
export function IconLogout(props) {
  return (
    <Svg {...props}>
      <path d="M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </Svg>
  )
}
export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 00-14.6-4.5L4 8" />
      <path d="M4 4v4h4M4 13a8 8 0 0014.6 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </Svg>
  )
}
