import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Tally() {
  const { id } = useParams();
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidatesMap, setCandidatesMap] = useState({});
  const fileInputRef = useRef(null);

  // 🟢 Ganti baris 14 menjadi:
  const baseUrl = 'https://pacebackend-3xerr6kk.b4a.run';

  const formatElectionCode = (id) => `ELC-2026-${String(id).padStart(2, '0')}`;

  useEffect(() => {
    const fetchCandidates = async () => {
      // Disesuaikan dengan baseUrl
      const res = await fetch(`${baseUrl}/api/admin/elections/${id}/candidates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach(c => { map[c.id] = c.name; });
        setCandidatesMap(map);
      }
    };
    fetchCandidates();
  }, [id, baseUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFileContent(evt.target.result);
    };
    reader.readAsText(file);
  };

  const handleTally = async () => {
    if (!fileContent) {
      setError('Silakan unggah file kunci privat (.pem) terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Disesuaikan dengan baseUrl
      const res = await fetch(`${baseUrl}/api/admin/elections/${id}/tally`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ privateKeyPem: fileContent })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan penghitungan suara');

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFileContent(null);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="dashboard-title">Penghitungan Suara ({formatElectionCode(id)})</h2>
        </div>
        <div className="header-actions">
          <Link to={`/admin/elections/${id}`} className="btn btn-secondary">Kembali ke Pemilu</Link>
        </div>
      </header>

      {!results && (
        <div className="panel upload-panel">
          <h3>Unggah Kunci Privat KPU</h3>
          <p className="warning-text">
            Unggah file <code>.pem</code> yang dihasilkan saat pemilu ini dibuat.
            Kunci ini akan digunakan untuk mendekripsi surat suara dan akan SEGERA DIHAPUS dari memori setelah proses penghitungan selesai.
          </p>
          
          <div className="form-group">
            <input 
              type="file" 
              accept=".pem" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="form-control"
            />
          </div>
          {fileName && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>File Terpilih: {fileName}</p>}
          
          {error && <div className="verification-banner error" style={{ marginBottom: '16px', marginTop: '16px' }}>{error}</div>}
          
          <div style={{ marginTop: '24px' }}>
            <button 
              onClick={handleTally} 
              disabled={!fileContent || loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Menghitung...' : 'Mulai Tally'}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="grid-cards">
            <div className="stat-card">
              <h4>Suara Sah</h4>
              <span className="stat-value text-success">{results.validCount}</span>
            </div>
            <div className="stat-card">
              <h4>Suara Tidak Sah</h4>
              <span className="stat-value" style={{ color: 'var(--danger)' }}>{results.invalidCount}</span>
            </div>
          </div>

          <div className="panel">
            <h3>Hasil Perolehan Suara</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kandidat</th>
                  <th>Jumlah Suara</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results.results).map(([candidateId, count]) => (
                  <tr key={candidateId}>
                    <td>{candidatesMap[candidateId] || `Kandidat #${candidateId}`}</td>
                    <td><strong>{count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.invalidBallots && results.invalidBallots.length > 0 && (
            <div className="panel">
              <h3>Detail Suara Tidak Sah</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Surat Suara</th>
                    <th>Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {results.invalidBallots.map((b, idx) => (
                    <tr key={idx}>
                      <td>{b.ballotId}</td>
                      <td>{b.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
