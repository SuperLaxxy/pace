import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('adminToken', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-wrapper" style={{ margin: '0 auto' }}>
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <div className="logo">
            <span className="logo-text" style={{ fontSize: '2.5rem' }}>PACE</span><span className="logo-dot" style={{ fontSize: '2.5rem' }}>.</span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Panel Admin KPU</p>
        </div>

        <div className="glass-card auth-card">
          <form onSubmit={handleLogin} className="auth-form active" style={{ display: 'block' }}>
            <div className="auth-header text-center">
              <h2 className="auth-title">Login Admin</h2>
              <p className="auth-subtitle">Masukkan kredensial KPU untuk mengelola pemilu.</p>
            </div>

            {error && <div className="warning-text text-center">{error}</div>}

            <div className="form-group">
              <label className="form-label">Nama Pengguna</label>
              <input
                type="text"
                className="form-control"
                placeholder="Username KPU"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kata Sandi</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', marginTop: '12px' }}>Masuk Panel KPU</button>
          </form>

          <div className="auth-footer text-center" style={{ marginTop: '24px' }}>
            <Link to="/" className="back-link">← Kembali ke Beranda</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
