import { NavLink } from 'react-router-dom'
import { HomeIcon, FlaskIcon, MapPinIcon, PhoneIcon } from './icons'
import './BottomNav.css'

const items = [
  { to: '/', label: 'الرئيسية', Icon: HomeIcon, end: true },
  { to: '/packages', label: 'الباقات والتحاليل', Icon: FlaskIcon },
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
