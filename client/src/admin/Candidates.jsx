import { useState, useEffect } from 'react';

export default function Candidates({ electionId }) {
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState('');
  const [ballotNumber, setBallotNumber] = useState('');
  const [vision, setVision] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCandidates = async () => {
    const res = await fetch(`/api/admin/elections/${electionId}/candidates`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    });
    if (res.ok) {
      setCandidates(await res.json());
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [electionId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/admin/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ election_id: electionId, ballot_number: ballotNumber, name, vision })
    });
    if (res.ok) {
      setName('');
      setBallotNumber('');
      setVision('');
      setSuccess('Kandidat berhasil ditambahkan.');
      fetchCandidates();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      const data = await res.json();
      setError(data.error || 'Gagal menambahkan kandidat');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="panel candidates-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '24px' }}>Tambah Kandidat</h3>
        
        {error && <div className="verification-banner error" style={{ marginBottom: '16px', padding: '12px' }}>{error}</div>}
        {success && <div className="verification-banner success" style={{ marginBottom: '16px', padding: '12px' }}>{success}</div>}

        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 2fr auto', gap: '20px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>No. Urut</label>
            <input type="number" className="form-control" value={ballotNumber} onChange={e => setBallotNumber(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Nama</label>
            <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Visi Misi</label>
            <input type="text" className="form-control" value={vision} onChange={e => setVision(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tambah</button>
        </form>
      </div>

      <div className="panel candidates-table-panel" style={{ padding: '0' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0 }}>Daftar Kandidat</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-300)' }}>No.</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-300)' }}>Nama</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-300)' }}>Visi Misi</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>{c.ballot_number}</td>
                  <td style={{ padding: '16px' }}>{c.name}</td>
                  <td style={{ padding: '16px' }}>{c.vision}</td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-500)' }}>Belum ada kandidat terdaftar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
