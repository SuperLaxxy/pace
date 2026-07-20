import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({ voters: 0, votes: 0 });
  const [integrity, setIntegrity] = useState({ valid: true, checking: true });
  const [auditLog, setAuditLog] = useState([]);
  const [elections, setElections] = useState([]);

  // 🟢 Ganti ke domain Back4app aktif
  const baseUrl = 'https://pacebackend-3xerr6kk.b4a.run';

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
      
      const resElections = await fetch(`${baseUrl}/api/admin/elections`, { headers });
      if (resElections.ok) setElections(await resElections.json());

      const resVoters = await fetch(`${baseUrl}/api/admin/voters`, { headers });
      if (resVoters.ok) {
        const voters = await resVoters.json();
        setStats({
          voters: voters.length,
          votes: voters.filter(v => v.has_voted).length
        });
      }

      const resVerify = await fetch(`${baseUrl}/api/admin/audit-log/verify`, { headers });
      if (resVerify.ok) {
        const verifyData = await resVerify.json();
        setIntegrity({ valid: verifyData.valid, checking: false });
      }

      const resAudit = await fetch(`${baseUrl}/api/admin/audit-log`, { headers });
      if (resAudit.ok) {
        const logs = await resAudit.json();
        setAuditLog(logs.reverse().slice(0, 5)); // Last 5 logs
      }

    } catch (e) {
      console.warn("API failed, using empty data.");
      setIntegrity({ valid: false, checking: false });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderEventTitle = (type) => {
    if (type === 'VOTE_CAST') return 'Suara Diterima & Terverifikasi';
    if (type === 'VOTER_ACTIVATED') return 'Pemilih Diaktivasi';
    return type;
  };

  const formatElectionCode = (id) => `ELC-2026-${String(id).padStart(2, '0')}`;

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Overview</h1>
          <p className="dashboard-subtitle">Pantau status pemilu dan integritas sistem PACE.</p>
        </div>
        <div className="header-actions">
          {/* Tombol Export Log disembunyikan sampai endpoint tersedia */}
        </div>
      </header>

      {/* Stats */}
      <div className="grid-cards">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5c-1 0-2 .9-2 2v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
          <h3 className="stat-title">Pemilih Terdaftar</h3>
          <div className="stat-value">{stats.voters}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3 className="stat-title">Suara Masuk (Enkripsi)</h3>
          <div className="stat-value">{stats.votes}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <h3 className="stat-title">Status Integritas</h3>
          <div className="stat-value" style={{ color: integrity.checking ? '#9ca3af' : (integrity.valid ? '#34d399' : '#ef4444'), fontSize: '1.5rem', marginTop: '5px' }}>
            {integrity.checking ? 'Memeriksa...' : (integrity.valid ? 'Valid (HMAC Checked)' : 'INVALID / TERGANGGU')}
          </div>
        </div>
      </div>

      {/* Active Election Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Pemilu Berjalan / Terdaftar</h3>
          <Link to="/admin/elections/create" className="btn btn-primary">Buat Pemilu</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Judul Pemilu</th>
              <th>Status</th>
              <th>Dibuat Pada</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {elections.map(el => (
              <tr key={el.id}>
                <td>{formatElectionCode(el.id)}</td>
                <td>{el.title}</td>
                <td><span className={`status-badge status-${el.status}`}>{el.status}</span></td>
                <td>{new Date(el.created_at).toLocaleDateString()}</td>
                <td>
                  <Link to={`/admin/elections/${el.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Kelola</Link>
                </td>
              </tr>
            ))}
            {elections.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '24px' }}>Tidak ada pemilu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Log Preview */}
      <div className="audit-log">
        <div className="table-header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <h3>Live Audit Log (HMAC Chain)</h3>
        </div>
        
        {auditLog.map(log => (
          <div className="log-item" key={log.seq}>
            <div className="log-icon" style={{ background: log.event_type === 'VOTE_CAST' ? 'var(--success)' : (log.event_type === 'VOTER_ACTIVATED' ? '#3b82f6' : 'var(--bg-card)') }}>
              {log.event_type === 'VOTE_CAST' || log.event_type === 'VOTER_ACTIVATED' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </div>
            <div className="log-content">
              <div className="log-title">{renderEventTitle(log.event_type)}</div>
              <p className="feature-desc" style={{ marginBottom: '8px' }}>Seq: {log.seq} | {log.detail.substring(0, 60)}...</p>
              <div className="log-hash">mac: <span style={{ fontFamily: 'monospace' }}>{log.mac.substring(0, 8)}...{log.mac.substring(log.mac.length - 8)}</span></div>
            </div>
          </div>
        ))}
        {auditLog.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Belum ada log audit.</p>}
      </div>
    </>
  );
}
