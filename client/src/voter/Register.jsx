import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Register() {
  const [nim, setNim] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, name, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }

      if (data.id) {
        localStorage.removeItem(`pace_voter_private_key_${data.id}`);
      }

      alert('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      console.warn("Menggunakan mode demo (API gagal):", err);
      alert('Mode demo: Registrasi disimulasikan berhasil.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-wrapper" style={{ margin: '0 auto' }}>
        
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <div className="logo">
            <span className="logo-text" style={{ fontSize: '2.5rem' }}>PACE</span><span className="logo-dot" style={{ fontSize: '2.5rem' }}>.</span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Portal Pemilihan Mahasiswa</p>
        </div>

        <div className="glass-card auth-card">
          <div className="auth-tabs">
            <Link to="/login" className="auth-tab" style={{ display: 'block', textAlign: 'center' }}>Masuk</Link>
            <Link to="/register" className="auth-tab active" style={{ display: 'block', textAlign: 'center' }}>Daftar</Link>
          </div>

          <form onSubmit={handleRegister} className="auth-form active" style={{ display: 'block' }}>
            <div className="auth-header">
              <h2 className="auth-title">Registrasi Pemilih</h2>
              <p className="auth-subtitle">Daftarkan diri Anda untuk berpartisipasi dalam pemilu.</p>
            </div>

            {error && <div className="warning-text text-center">{error}</div>}

            <div className="form-group">
              <label className="form-label">NIM</label>
              <input 
                type="text" 
                className="form-control"
                value={nim} 
                onChange={(e) => setNim(e.target.value)} 
                required 
                placeholder="Contoh: 13523001"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input 
                type="text" 
                className="form-control"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Sesuai KTM"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Kata Sandi</label>
              <input 
                type="password" 
                className="form-control"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Gunakan password kuat"
                minLength={8}
              />
            </div>

            <div className="security-note">
              <div className="note-icon">🔒</div>
              <div className="note-text">
                Setelah registrasi, akun Anda perlu diaktivasi oleh Admin (KPU) sebelum dapat memberikan suara.
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="auth-footer text-center">
            <Link to="/" className="back-link">← Kembali ke Beranda</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
