import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Login() {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('voter_id', data.voter.id);
      localStorage.setItem('voter_nim', data.voter.nim);
      
      // Cek apakah user sudah punya kunci di lokal
      const hasKey = localStorage.getItem(`pace_voter_private_key_${data.voter.id}`);
      if (!hasKey) {
        navigate('/setup-key');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
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
            <Link to="/login" className="auth-tab active" style={{ display: 'block', textAlign: 'center' }}>Masuk</Link>
            <Link to="/register" className="auth-tab" style={{ display: 'block', textAlign: 'center' }}>Daftar</Link>
          </div>

          <form onSubmit={handleLogin} className="auth-form active" style={{ display: 'block' }}>
            <div className="auth-header">
              <h2 className="auth-title">Selamat Datang</h2>
              <p className="auth-subtitle">Masukkan NIM dan kata sandi Anda untuk memberikan suara.</p>
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
                placeholder="Contoh: 12345678"
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
                placeholder="••••••••"
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk ke Bilik Suara'}
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
