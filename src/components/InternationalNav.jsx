import { Link, useLocation } from 'react-router-dom'
import { FlaskIcon, MapPinIcon, CalendarIcon } from './icons'
import './InternationalNav.css'

const links = [
  { to: '/international', label: 'Packages', Icon: FlaskIcon },
  { to: '/international/branches', label: 'Branches', Icon: MapPinIcon },
  { to: '/international/booking', label: 'Booking', Icon: CalendarIcon },
]

export default function InternationalNav() {
  const { pathname } = useLocation()

  return (
    <nav className="intl-nav" dir="ltr">
      {links.map(({ to, label, Icon }) => (
        <Link key={to} to={to} className={`intl-nav__link${pathname === to ? ' active' : ''}`}>
          <Icon width={20} height={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
