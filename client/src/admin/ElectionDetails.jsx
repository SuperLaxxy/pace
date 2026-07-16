import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Candidates from './Candidates';
import ElectionControl from './ElectionControl';

export default function ElectionDetails() {
  const { id } = useParams();
  const [election, setElection] = useState(null);

  const [error, setError] = useState('');

  const fetchElection = async () => {
    try {
      const res = await fetch(`/api/admin/elections/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        setElection(await res.json());
      } else {
        setError('Gagal mengambil data pemilu.');
      }
    } catch (e) {
      console.error("API failed:", e);
      setError('Terjadi kesalahan jaringan.');
    }
  };

  useEffect(() => {
    fetchElection();
  }, [id]);

  if (error) return <div className="verification-banner error" style={{ margin: '40px' }}>{error}</div>;
  if (!election) return <div className="text-center" style={{ padding: '40px' }}><div className="loader-spinner"></div></div>;

  const formatElectionCode = (id) => `ELC-2026-${String(id).padStart(2, '0')}`;

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{election.title}</h1>
          <p className="dashboard-subtitle">ID: {formatElectionCode(election.id)}</p>
        </div>
        <div className="header-actions">
          <span className={`status-badge status-${election.status}`}>{election.status.toUpperCase()}</span>
        </div>
      </header>
      
      <div className="grid-cards" style={{ marginBottom: '32px' }}>
        <div className="stat-card" style={{ gridColumn: 'span 1' }}>
          <ElectionControl election={election} onUpdate={fetchElection} />
        </div>
        
        {election.status === 'closed' && (
          <div className="stat-card" style={{ gridColumn: 'span 2', background: 'var(--panel-bg)', borderColor: 'var(--primary)' }}>
            <h3 className="stat-title" style={{ color: 'var(--primary)', marginBottom: '12px' }}>Hasil Penghitungan Tersedia</h3>
            <p className="feature-desc">Pemilu telah ditutup. Anda sekarang dapat menghitung suara secara aman dengan kunci privat KPU.</p>
            <Link to={`/admin/elections/${id}/tally`} className="btn btn-primary" style={{ marginTop: '16px' }}>Ke Panel Tally & Dekripsi</Link>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <Candidates electionId={id} />
      </div>
    </>
  );
}
