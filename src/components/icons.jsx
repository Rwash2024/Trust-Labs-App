const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function FlaskIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  )
}

export function MapPinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  )
}

export function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M6.5 3h3l1.5 4.5-2.3 1.8a12 12 0 0 0 5.5 5.5l1.8-2.3L20 14v3a2 2 0 0 1-2 2C10.8 19 5 13.2 5 6a2 2 0 0 1 1.5-3Z" />
    </svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

export function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...props}>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.31 2 11.63c0 1.98.62 3.82 1.68 5.35L2.2 22l5.24-1.36a10.2 10.2 0 0 0 4.56 1.08c5.52 0 10-4.31 10-9.63C22 6.31 17.52 2 12 2Zm0 17.53c-1.5 0-2.9-.4-4.1-1.1l-.3-.17-3.1.81.83-2.96-.2-.31a7.75 7.75 0 0 1-1.25-4.17c0-4.35 3.65-7.87 8.12-7.87s8.12 3.52 8.12 7.87-3.65 7.9-8.12 7.9Z"
      />
      <path
        fill="currentColor"
        d="M16.2 13.68c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  )
}

export function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

export function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1.2 5 1.8 5.6H4.2C4.8 14 6 12.5 6 9Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  )
}

export function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ResultsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="m9 13 2 2 4-4.5" />
    </svg>
  )
}

export function CardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14h4" />
    </svg>
  )
}

export function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.5Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.9" />
    </svg>
  )
}

export function PercentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M6 18 18 6" />
      <circle cx="7.5" cy="7.5" r="2.2" />
      <circle cx="16.5" cy="16.5" r="2.2" />
    </svg>
  )
}

export function GiftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <rect x="3.5" y="9.5" width="17" height="4" rx="1" />
      <path d="M5 13.5v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19.5v-6" />
      <path d="M12 9.5v11" />
      <path d="M12 9.5C10.5 6 7 5.5 7 7.7 7 9.5 9 9.5 12 9.5Z" />
      <path d="M12 9.5C13.5 6 17 5.5 17 7.7c0 1.8-2 1.8-5 1.8Z" />
    </svg>
  )
}

export function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
      <path
        fill="currentColor"
        d="M13.5 21v-7.6h2.6l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.28C16.3 4.2 15.4 4.1 14.36 4.1c-2.15 0-3.62 1.3-3.62 3.7v2.6H8.1v3h2.64V21h2.76Z"
      />
    </svg>
  )
}

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
      <path
        fill="currentColor"
        d="M6.94 8.5a1.94 1.94 0 1 0 0-3.88 1.94 1.94 0 0 0 0 3.88ZM5.2 10.2h3.5V19H5.2v-8.8ZM11.4 10.2h3.35v1.2h.05c.47-.85 1.6-1.75 3.3-1.75 3.53 0 4.18 2.24 4.18 5.15V19h-3.5v-4.3c0-1.03-.02-2.35-1.44-2.35-1.44 0-1.66 1.1-1.66 2.28V19h-3.5v-8.8Z"
      />
    </svg>
  )
}

export function TechIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M7 9.5H4M7 14.5H4M20 9.5h-3M20 14.5h-3" />
    </svg>
  )
}

export function TeamIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4 19c0-2.8 2.24-4.6 5-4.6s5 1.8 5 4.6" />
      <circle cx="17" cy="8.5" r="2" />
      <path d="M15.3 14.7c1.9.3 3.7 1.6 3.7 3.9" />
    </svg>
  )
}

export function CartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.8h8.2a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}
