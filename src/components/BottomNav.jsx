import { NavLink } from 'react-router-dom'
import { HomeIcon, FlaskIcon, MapPinIcon, PhoneIcon, ShieldIcon } from './icons'
import './BottomNav.css'

// Order matches the RTL visual layout: index 0 renders furthest right.
// Requested layout: شروط التحضير | الباقات والتحاليل | الرئيسية (center) | الفروع | تواصل معنا
const items = [
  { to: '/prep-instructions', label: 'شروط التحضير', Icon: ShieldIcon },
  { to: '/packages', label: 'الباقات والتحاليل', Icon: FlaskIcon },
  { to: '/', label: 'الرئيسية', Icon: HomeIcon, end: true },
  { to: '/branches', label: 'الفروع', Icon: MapPinIcon },
  { to: '/contact', label: 'تواصل معنا', Icon: PhoneIcon },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav__icon">
            <Icon />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
