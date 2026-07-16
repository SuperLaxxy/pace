import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadPrivateKey } from '../crypto/keystore.js';
import { sealBallot } from '../crypto/seal.js';

export default function Vote() {
  const { electionId, candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ballotNumber = location.state?.ballotNumber || candidateId; // Fallback ke candidateId jika dibuka langsung
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voterId, setVoterId] = useState('');
  const [progress, setProgress] = useState(0);
  const [processDesc, setProcessDesc] = useState('');

  useEffect(() => {
    const storedVoterNim = localStorage.getItem('voter_nim') || 'Unknown';
    setVoterId(storedVoterNim);
  }, []);

  const handleVote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProgress(10);
    setProcessDesc('Memverifikasi kunci keamanan...');

    try {
      // 1. Load private key
      let privateKey;
      try {
        const actualVoterId = localStorage.getItem('voter_id');
        privateKey = await loadPrivateKey(password, undefined, actualVoterId);
      } catch (err) {
        throw new Error('Kata sandi salah atau kunci tidak ditemukan.');
      }

      setProgress(30);
      setProcessDesc('Mengekstrak kunci publik KPU...');

      // 2. Fetch RSA Public Key KPU
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/elections/${electionId}/pubkey`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal mengambil kunci publik pemilihan dari KPU');
      const data = await res.json();
      const kpuPubPem = data.publicKeyPem;

      setProgress(50);
      setProcessDesc('Mengenksripsi suara dengan AES-256-CBC...');

      // 3. Bangun Envelope
      const { envelope, signature } = await sealBallot(candidateId, electionId, kpuPubPem, privateKey);

      setProgress(70);
      setProcessDesc('Menandatangani envelope dengan ECDSA P-256...');

      const signerPublicKeyId = localStorage.getItem('voter_id');
      if (!signerPublicKeyId) {
        throw new Error('Sesi tidak valid, silakan login ulang');
      }

      const payload = {
        ...envelope,
        signature,
        signerPublicKeyId,
        candidateId
      };

      setProgress(85);
      setProcessDesc('Mengirim envelope aman ke server...');

      // 4. Kirim ke Server
      const voteRes = await fetch(`/api/elections/${electionId}/vote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const voteData = await voteRes.json();
      
      if (!voteRes.ok) {
        if (voteData.error === 'Voter public key not registered') {
          // Deteksi kunci stale (sisa uji coba sebelumnya)
          const actualVoterId = localStorage.getItem('voter_id');
          localStorage.removeItem(`pace_voter_private_key_${actualVoterId}`);
          alert('Sesi kunci Anda sudah tidak valid (mungkin karena reset database). Silakan buat kunci baru.');
          navigate('/setup-key');
          return;
        }
        throw new Error(voteData.error || 'Gagal mengirim suara');
      }

      setProgress(100);
      setProcessDesc('Suara berhasil terkirim!');

      // 5. Sukses
      setTimeout(() => {
        navigate(`/receipt/${voteData.receiptHash}`);
      }, 500);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
      setProgress(0);
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
        
        {loading ? (
          <div className="modal-card text-center glass-card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="loader-spinner" style={{ margin: '0 auto 24px' }}></div>
            <h3 className="modal-title" id="process-title">Memproses Suara</h3>
            <p className="modal-body" id="process-desc">
              {processDesc}
            </p>
            <div className="progress-bar-container" style={{ marginTop: '20px' }}>
              <div className="progress-bar" id="process-progress" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : (
          <div className="modal-card glass-card" style={{ maxWidth: '500px', width: '100%', position: 'relative', background: 'var(--panel-bg)' }}>
            <h3 className="modal-title">Konfirmasi Pilihan</h3>
            <p className="modal-body">
              Anda akan memberikan suara untuk <strong>Kandidat {ballotNumber}</strong>.<br/><br/>
              Setelah konfirmasi, browser akan mengenkripsi dan menandatangani pilihan Anda. <strong>Tindakan ini tidak dapat dibatalkan atau diulang.</strong>
            </p>

            {error && <div className="warning-text text-center">{error}</div>}

            <form onSubmit={handleVote} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Kata Sandi Kunci Keamanan</label>
                <input 
                  type="password" 
                  className="form-control"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Masukkan kata sandi kunci Anda"
                />
              </div>
              
              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Ya, Enkripsi & Kirim Suara
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
