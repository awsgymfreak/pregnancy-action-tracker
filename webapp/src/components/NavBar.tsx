import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/history', label: 'History', end: false },
  { to: '/actions', label: 'Actions', end: false },
  { to: '/settings', label: 'Settings', end: false },
];

export function NavBar() {
  return (
    <nav className="nav-bar">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
