import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/run', label: 'Run Application' },
  { to: '/profile', label: 'Profile' },
  { to: '/documents', label: 'Documents' },
  { to: '/snippets', label: 'Snippets' },
  { to: '/questions', label: 'Questions' },
  { to: '/applications', label: 'Applications' },
  { to: '/workday', label: 'Workday Accounts' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Job Apply Assistant</h1>
          <p>Local-first application helper</p>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
