import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? "nav-item active" : "nav-item";
  };

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-text">PACE</span><span className="logo-dot">.</span>
        </div>
        
        <nav className="nav-menu">
          <Link to="/admin/dashboard" className={isActive('/admin/dashboard')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            Overview
          </Link>
          <Link to="/admin/voters" className={isActive('/admin/voters')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5c-1 0-2 .9-2 2v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Pemilih
          </Link>
          <Link to="/admin/elections/create" className={isActive('/admin/elections/create')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Pemilu & Kandidat
          </Link>
          <Link to="/admin/tally" className={isActive('/admin/tally')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>
            Hasil & Tally
          </Link>
          <Link to="/admin/audit-log" className={isActive('/admin/audit-log')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Audit Log
          </Link>
        </nav>
        
        <div className="user-profile">
          <div className="avatar">K</div>
          <div className="user-info">
            <span className="user-name">Admin KPU</span>
            <span className="user-role" style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={handleLogout}>Keluar</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
