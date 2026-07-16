import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Receipt() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [voterId, setVoterId] = useState('');

  useEffect(() => {
    const storedVoterNim = localStorage.getItem('voter_nim') || 'Unknown';
    setVoterId(storedVoterNim);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('voter_id');
    navigate('/login');
  };

  return (
    <div className="voter-layout" style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span className="logo-text">PACE</span><span className="logo-dot">.</span>
          </div>
          <div className="user-profile" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none', display: 'flex', alignItems: 'center' }}>
            <span className="user-name" style={{ marginRight: '16px' }}>Voter: {voterId}</span>
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleLogout}>Keluar</button>
          </div>
        </div>
      </header>

      <main className="main-content container" style={{ paddingTop: '100px', display: 'flex', justifyContent: 'center' }}>
        <div className="receipt-card glass-card" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="receipt-icon">✅</div>
          <h2>Suara Berhasil Terenkripsi & Terkirim</h2>
          <p className="feature-desc" style={{ marginTop: '12px', marginBottom: 0 }}>
            Suara Anda telah dibungkus dengan AES-256-CBC, ditandatangani, dan dimasukkan ke kotak suara anonim.
          </p>
          
          <div className="receipt-hash">
            Receipt Hash: {hash}
          </div>
          
          <p className="feature-desc">
            Simpan receipt ini untuk memverifikasi bahwa suara Anda tercatat di audit log tanpa membocorkan pilihan Anda.
          </p>
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => window.print()}>Cetak / Unduh PDF</button>
            <button className="btn btn-primary" onClick={handleLogout}>Selesai & Keluar</button>
          </div>
        </div>
      </main>
    </div>
  );
}
