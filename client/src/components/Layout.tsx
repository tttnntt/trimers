import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';
import './Layout.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();

  const nav = [
    { path: '/', label: 'Home' },
    { path: '/groups', label: 'Groups' }
  ];

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="logo">trimers</Link>
        <nav className="layout-nav">
          {nav.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={loc.pathname === n.path ? 'active' : ''}
            >
              {n.label}
            </Link>
          ))}
          <Link to="/search">Search</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        {user && (
          <Link to="/settings" className="user-avatar">
            {user.profile_picture ? (
              <img src={`${API_BASE}/users/avatar`} alt="" /> 
            ) : (
              <span>{user.username?.[0] || user.email[0]}</span>
            )}
          </Link>
        )}
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
