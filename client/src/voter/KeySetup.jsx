import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateEcdsaKeypair, exportPublicKeySpkiPem } from '../crypto/ecdsa.js';
import { storePrivateKey } from '../crypto/keystore.js';

export default function KeySetup() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [voterId, setVoterId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedVoterNim = localStorage.getItem('voter_nim') || 'Unknown';
    setVoterId(storedVoterNim);
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Kata sandi tidak cocok!');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate keypair di browser
      const keypair = await generateEcdsaKeypair();

      // 2. Export public key & kirim ke server
      const pubKeyPem = await exportPublicKeySpkiPem(keypair.publicKey);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/voter/publickey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publicKeyPem: pubKeyPem })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mendaftarkan kunci publik di server.');
      }

      // 3. Encrypt private key dengan password dan simpan di localStorage
      const actualVoterId = localStorage.getItem('voter_id');
      const payloadStr = await storePrivateKey(keypair.privateKey, password, actualVoterId);

      // 4. Tawarkan unduhan sebagai file backup
      const blob = new Blob([payloadStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pace_backup_key.json';
      a.click();
      URL.revokeObjectURL(url);

      alert('Kunci berhasil dibuat dan dicadangkan! Jangan lupa kata sandi Anda.');
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal membuat kunci.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('voter_id');
    localStorage.removeItem('voter_nim');
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
        <div className="glass-card setup-box" style={{ maxWidth: '600px', width: '100%', padding: '32px' }}>
          <div className="text-center" style={{ marginBottom: '24px' }}>
            <h2 className="dashboard-title" style={{ fontSize: '1.75rem' }}>Aktivasi Kunci Keamanan</h2>
            <p className="feature-desc">
              Sistem PACE menggunakan <b>kriptografi end-to-end</b>. 
              Suara Anda akan ditandatangani menggunakan kunci privat yang dibuat di perangkat ini.
              Kunci privat Anda <b>tidak pernah dikirim ke server</b>.
            </p>
          </div>
          
          <div className="security-banner" style={{ marginBottom: '24px' }}>
            <div className="security-icon">🔒</div>
            <div className="security-text" style={{ fontSize: '0.85rem' }}>
              <b>PENTING:</b> Kunci akan dienkripsi dengan kata sandi di bawah. 
              Jika Anda lupa kata sandi atau kehilangan file cadangan, Anda tidak bisa melakukan pemilihan.
            </div>
          </div>

          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Kata Sandi Kunci</label>
              <input 
                type="password" 
                className="form-control"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Gunakan sandi yang kuat"
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Kata Sandi</label>
              <input 
                type="password" 
                className="form-control"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="Ulangi kata sandi"
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              {loading ? 'Membangkitkan...' : 'Bangkitkan Kunci'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
