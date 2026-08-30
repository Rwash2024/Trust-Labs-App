import { NavLink } from 'react-router-dom'
import { HomeIcon, FlaskIcon, MapPinIcon, PhoneIcon, ShieldIcon } from './icons'
import './BottomNav.css'

// Order matches the RTL visual layout: index 0 renders furthest right.
// Requested layout: الباقات والتحاليل | شروط التحضير | الرئيسية (center) | الفروع | تواصل معنا
const items = [
  { to: '/packages', label: 'الباقات والتحاليل', Icon: FlaskIcon },
  { to: '/prep-instructions', label: 'شروط التحضير', Icon: ShieldIcon },
  { to: '/', label: 'الرئيسية', Icon: HomeIcon, end: true, big: true },
  { to: '/branches', label: 'الفروع', Icon: MapPinIcon },
  { to: '/contact', label: 'تواصل معنا', Icon: PhoneIcon },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icon, end, big }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}${big ? ' bottom-nav__item--big' : ''}`}
        >
          <span className="bottom-nav__icon">
            <Icon width={big ? 26 : 22} height={big ? 26 : 22} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
