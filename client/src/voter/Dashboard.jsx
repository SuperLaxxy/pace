import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voterId, setVoterId] = useState('');
  const navigate = useNavigate();

  const [election, setElection] = useState(null);

  useEffect(() => {
    const storedVoterNim = localStorage.getItem('voter_nim') || 'Unknown';
    setVoterId(storedVoterNim);

    const actualVoterId = localStorage.getItem('voter_id');
    if (!actualVoterId) {
      navigate('/login');
      return;
    }

    const hasKey = localStorage.getItem(`pace_voter_private_key_${actualVoterId}`);
    if (!hasKey) {
      navigate('/setup-key');
      return;
    }

    async function fetchActiveElection() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/elections/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No active election');
        const data = await res.json();
        setElection(data);
        fetchCandidates(data.id, token);
      } catch (err) {
        console.warn("Failed to fetch active election:", err);
        setLoading(false);
      }
    }

    async function fetchCandidates(electionId, token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/elections/${electionId}/candidates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch candidates');
        const data = await res.json();
        setCandidates(data.candidates || data);
      } catch (err) {
        console.warn("Failed to fetch candidates:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchActiveElection();
  }, [navigate]);

  const handleVoteClick = (candidate) => {
    if (!election) return;
    navigate(`/vote/${election.id}/${candidate.id}`, { state: { ballotNumber: candidate.ballot_number } });
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

      <main className="main-content container" style={{ paddingTop: '100px' }}>
        
        {/* Security Banner */}
        <div className="security-banner">
          <div className="security-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
          </div>
          <div className="security-text">
            <h4>Kunci Kriptografi Siap</h4>
            <p>Browser Anda telah menyiapkan pasangan kunci ECDSA P-256. Suara Anda akan dienkripsi secara end-to-end.</p>
          </div>
        </div>

        {/* Election Info */}
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div>
            <div className="badge" style={{ marginBottom: '12px' }}>{election ? 'Pemilu Aktif' : 'Tidak Ada Pemilu Aktif'}</div>
            <h1 className="dashboard-title">{election ? election.title : 'Menunggu Pemilu'}</h1>
            <p className="dashboard-subtitle">{election ? 'Silakan pilih satu kandidat. Anda hanya dapat memberikan suara tepat satu kali.' : 'Saat ini belum ada pemilu yang dibuka oleh KPU.'}</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="loader-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Memuat kandidat...</p>
          </div>
        ) : (
          <div className="candidate-grid" id="candidate-view">
            {candidates.map(c => (
              <div key={c.id} className="candidate-card">
                <div className="candidate-photo">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <div className="candidate-number">{c.ballot_number}</div>
                </div>
                <div className="candidate-info">
                  <h3 className="candidate-name">{c.name}</h3>
                  <p className="candidate-vision">"{c.vision}"</p>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleVoteClick(c)}
                  >
                    Pilih Kandidat {c.ballot_number}
                  </button>
                </div>
              </div>
            ))}
            {candidates.length === 0 && <div className="text-center" style={{ gridColumn: '1 / -1' }}>Belum ada kandidat terdaftar.</div>}
          </div>
        )}
      </main>
    </div>
  );
}
