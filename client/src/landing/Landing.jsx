import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CRYPTO_ALGOS = [
  { name: 'RSA-OAEP', desc: 'Hybrid Key Wrapping' },
  { name: 'AES-256-CBC', desc: 'Ballot Encryption' },
  { name: 'HMAC-SHA256', desc: 'Integrity Verification' },
  { name: 'ECDSA P-256', desc: 'Digital Signature' }
];

const LiveBallotBox = () => {
  return (
    <div className="ballot-stream">
      {CRYPTO_ALGOS.map((algo, idx) => (
        <div className="ballot-item" key={idx} style={{ animation: 'none' }}>
          <div className="ballot-icon">🔒</div>
          <div className="ballot-details">
            <div className="ballot-id">{algo.name}</div>
            <div className="ballot-time">{algo.desc}</div>
          </div>
          <div className="ballot-status">Aktif</div>
        </div>
      ))}
    </div>
  );
};

const Landing = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/stats/public')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setStats(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span className="logo-text">PACE</span>
            <span className="logo-dot">.</span>
          </div>
          <nav className="nav-links">
            <a href="#fitur">Fitur Keamanan</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#tentang">Tentang</a>
          </nav>
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-outline">Masuk</Link>
            <Link to="/register" className="btn btn-primary">Registrasi</Link>
          </div>
          <button className="mobile-menu-btn" aria-label="Menu" id="mobile-menu-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-bg-glow"></div>
          <div className="container hero-container">
            <div className="hero-content">
              <div className="badge">E-Voting Terverifikasi</div>
              <h1 className="hero-title">Sistem E-Voting Aman untuk <span>Pemilu Mahasiswa</span></h1>
              <p className="hero-subtitle">
                Tinggalkan surat suara kertas. PACE menghadirkan pemilihan digital yang keamanannya bertumpu pada kriptografi matematis yang dapat diverifikasi siapa pun, bukan sekadar kepercayaan pada panitia.
              </p>
              <div className="hero-actions">
                <Link to="/login" className="btn btn-primary btn-large">Mulai Memilih</Link>
                <a href="#fitur" className="btn btn-secondary btn-large">Pelajari Keamanan</a>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-value">End-to-End</span>
                  <span className="stat-label">Enkripsi Suara</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">Terverifikasi</span>
                  <span className="stat-label">Integritas Suara</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">{stats?.voters ?? '—'}</span>
                  <span className="stat-label">Pemilih Terdaftar</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="glass-card visual-card">
                <div className="card-header">
                  <div className="dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="card-title">Live Ballot Box</div>
                </div>
                <LiveBallotBox />
              </div>
              <div className="visual-glow"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" className="features reveal">
          <div className="container">
            <div className="section-header text-center">
              <h2 className="section-title">Empat Pilar <span>Keamanan Inti</span></h2>
              <p className="section-desc">Platform PACE dibangun dengan standar kriptografi industri untuk menjamin pemilu yang bersih, transparan, dan rahasia.</p>
            </div>
            <div className="features-grid">
              
              <div className="feature-card glass-panel">
                <div className="feature-icon bg-blue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h3 className="feature-title">Confidentiality</h3>
                <p className="feature-desc">Tak ada pihak (termasuk admin KPU) yang bisa membaca suara sebelum waktu penghitungan resmi berkat enkripsi AES + RSA key-wrapping.</p>
                <div className="feature-tag">AES-256-CBC</div>
              </div>

              <div className="feature-card glass-panel">
                <div className="feature-icon bg-purple">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <h3 className="feature-title">Integrity</h3>
                <p className="feature-desc">Setiap manipulasi data suara di basis data terdeteksi otomatis. Perubahan 1 bit akan membatalkan verifikasi suara.</p>
                <div className="feature-tag">HMAC-SHA256</div>
              </div>

              <div className="feature-card glass-panel">
                <div className="feature-icon bg-green">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1 0-2 .9-2 2v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
                </div>
                <h3 className="feature-title">Authentication</h3>
                <p className="feature-desc">Hanya mahasiswa dengan NIM valid yang bisa memilih. Tanda tangan digital mencegah penyangkalan suara dari pemilih yang sah.</p>
                <div className="feature-tag">ECDSA P-256</div>
              </div>

              <div className="feature-card glass-panel">
                <div className="feature-icon bg-orange">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="3" x2="21" y2="21"></line></svg>
                </div>
                <h3 className="feature-title">Ballot Secrecy</h3>
                <p className="feature-desc">Pemisahan arsitektural memastikan siapa-memilih-siapa tidak dapat dikorelasikan. Data partisipasi terpisah penuh dari kotak suara anonim.</p>
                <div className="feature-tag">Arch Isolation</div>
              </div>

            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="cara-kerja" className="flow-section reveal">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Alur Memilih yang <span>Simpel & Aman</span></h2>
              <p className="section-desc">Kriptografi kompleks di balik layar, antarmuka sederhana untuk Anda.</p>
            </div>
            
            <div className="flow-steps">
              <div className="step-card">
                <div className="step-number">01</div>
                <h3 className="step-title">Login dengan NIM</h3>
                <p className="step-desc">Autentikasi menggunakan NIM dan password terenkripsi Argon2id. Sistem memastikan Anda terdaftar sebagai pemilih sah.</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">02</div>
                <h3 className="step-title">Generate Kunci</h3>
                <p className="step-desc">Browser Anda secara otomatis membangkitkan pasangan kunci ECDSA rahasia yang tidak pernah dikirim ke server KPU.</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">03</div>
                <h3 className="step-title">Berikan Suara</h3>
                <p className="step-desc">Pilih kandidat. Surat suara akan dienkripsi dan ditandatangani secara end-to-end sebelum dikirimkan ke kotak suara anonim.</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">04</div>
                <h3 className="step-title">Dapatkan Receipt</h3>
                <p className="step-desc">Terima bukti hash surat suara sebagai konfirmasi tanpa membocorkan pilihan Anda. Verifikasi bahwa suara Anda masuk.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section reveal">
          <div className="container">
            <div className="cta-box glass-panel">
              <h2 className="cta-title">Siap untuk Pemilu yang Bersih?</h2>
              <p className="cta-desc">Jadilah bagian dari revolusi demokrasi digital di kampus dengan PACE.</p>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-large">Daftar Pemilih</Link>
                <Link to="/admin/login" className="btn btn-outline btn-large">Login KPU</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="tentang" className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <span className="logo-text">PACE</span><span className="logo-dot">.</span>
              </div>
              <p className="footer-bio">Papua Cyber Election (PACE) adalah inovasi sistem pemungutan suara mahasiswa dengan jaminan kriptografi tingkat lanjut.</p>
            </div>
            <div className="footer-links">
              <h4>Navigasi</h4>
              <ul>
                <li><a href="#fitur">Fitur Keamanan</a></li>
                <li><a href="#cara-kerja">Cara Kerja</a></li>
                <li><a href="#tentang">Tim Pengembang</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Legal & Bantuan</h4>
              <ul>
                <li><Link to="/login">Buku Panduan</Link></li>
                <li><Link to="/admin/login">Audit Log</Link></li>
                <li><Link to="/">Hubungi KPU</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Kriptografi Kelompok 5. Seluruh Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Landing;
