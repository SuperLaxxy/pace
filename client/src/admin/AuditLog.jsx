import { useState, useEffect } from 'react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchLogs = async () => {
    const res = await fetch('/api/admin/audit-log', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    });
    if (res.ok) {
      setLogs(await res.json());
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const [verifyError, setVerifyError] = useState('');

  const verifyIntegrity = async () => {
    setVerificationResult(null);
    setVerifyError('');
    try {
      const res = await fetch('/api/admin/audit-log/verify', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        setVerificationResult(await res.json());
      } else {
        setVerifyError('Permintaan verifikasi gagal');
      }
    } catch (e) {
      setVerifyError('Kesalahan jaringan saat verifikasi');
    }
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " menit lalu";
    return Math.floor(seconds) + " detik lalu";
  };

  const renderEventType = (type) => {
    if (type === 'VOTE_CAST') {
      return (
        <div>
          <span className="badge" style={{ backgroundColor: 'var(--success)', color: '#fff', border: 'none' }}>
            ✓ Suara Diterima & Terverifikasi
          </span>
          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
            Tanda tangan valid. HMAC valid. Ditambahkan ke kotak suara anonim.
          </div>
        </div>
      );
    }
    if (type === 'VOTER_ACTIVATED') {
      return (
        <span className="badge" style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none' }}>
          ✓ Pemilih Diaktivasi
        </span>
      );
    }
    return <span className="badge">{type}</span>;
  };

  return (
    <div className="admin-audit-log">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Log Audit</h1>
          <p className="dashboard-subtitle">Pantau dan verifikasi integritas aktivitas sistem</p>
        </div>
        <div className="header-actions">
          <button onClick={verifyIntegrity} className="btn btn-primary">Verifikasi Integritas</button>
        </div>
      </header>

      {verifyError && <div className="verification-banner error" style={{ margin: '24px 0' }}>{verifyError}</div>}

      {verificationResult && (
        <div className={`verification-banner ${verificationResult.valid ? 'success' : 'error'}`} style={{ margin: '24px 0' }}>
          {verificationResult.valid ? (
            <h3>✅ Integritas Log Audit Terverifikasi. Semua HMAC valid.</h3>
          ) : (
            <h3>❌ DETEKSI MANIPULASI pada urutan {verificationResult.brokenAtSeq}. Alasan: {verificationResult.reason}</h3>
          )}
        </div>
      )}

      <div className="table-container panel" style={{ marginTop: '24px', padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-300)' }}>No. Urut</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-300)' }}>Tipe</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-300)' }}>Detail</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-300)' }}>MAC (Dipotong)</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-300)' }}>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className={verificationResult && verificationResult.brokenAtSeq === log.seq ? 'highlight-error' : ''} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px' }}>{log.seq}</td>
                <td style={{ padding: '16px' }}>{renderEventType(log.event_type)}</td>
                <td style={{ padding: '16px' }}>{log.detail}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontFamily: 'monospace', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }} title={log.mac}>
                    {log.mac.substring(0, 8)}...{log.mac.substring(log.mac.length - 8)}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>{timeAgo(log.created_at)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-500)' }}>
                  <div style={{ marginBottom: '12px', fontSize: '2rem' }}>📝</div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: 'var(--text-100)' }}>Belum ada aktivitas tercatat.</p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Log akan muncul saat ada suara masuk atau aktivasi pemilih.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
