import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateElection() {
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState(null);
  const [electionId, setElectionId] = useState(null);
  const [keyConfirmed, setKeyConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Tambahkan baris ini
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${baseUrl}/api/admin/elections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ title, start_at: startAt, end_at: endAt })
      });
      if (res.ok) {
        const data = await res.json();
        setError('');
        setElectionId(data.id);
        // UX Kritis A: Show modal with private key
        setPrivateKeyPem(data.privateKeyPem);
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal membuat pemilu');
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat pemilu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKey = () => {
    const blob = new Blob([privateKeyPem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'pemilu';
    a.download = `kpu_private_key_${safeTitle}.pem`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseModal = () => {
    if (!keyConfirmed) return;
    setPrivateKeyPem(null);
    if (electionId) {
      navigate(`/admin/elections/${electionId}`);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="panel">
        <h2 style={{ marginBottom: '24px' }}>Buat Pemilu Baru</h2>
        {error && <div className="verification-banner error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Judul Pemilu</label>
            <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Waktu Mulai (opsional)</label>
            <input type="datetime-local" className="form-control" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Waktu Selesai (opsional)</label>
            <input type="datetime-local" className="form-control" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Membuat...' : 'Buat Pemilu'}
            </button>
          </div>
        </form>
      </div>

      {privateKeyPem && (
        <div 
          className="modal-overlay active"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div className="modal-card">
            <h3 style={{ color: 'var(--danger)' }}>KRITIS: Simpan Kunci Privat</h3>
            <div className="verification-banner error" style={{ margin: '16px 0', fontSize: '14px' }}>
              <strong>PERINGATAN:</strong> Ini adalah <strong>satu-satunya salinan</strong> kunci privat ini. 
              Server <strong>tidak menyimpannya</strong>. Tanpa kunci ini, hasil pemilu tidak bisa di-tally.
            </div>
            
            <div className="form-group">
              <textarea 
                className="form-control" 
                value={privateKeyPem} 
                readOnly 
                rows="6"
                style={{ fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
              />
            </div>
            
            <button 
              type="button" 
              onClick={handleDownloadKey} 
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '16px' }}
            >
              Unduh Kunci (.pem)
            </button>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={keyConfirmed} 
                  onChange={e => setKeyConfirmed(e.target.checked)} 
                  style={{ width: '16px', height: '16px' }}
                />
                Saya sudah menyimpan kunci ini
              </label>
            </div>
            
            <button 
              type="button" 
              onClick={handleCloseModal} 
              disabled={!keyConfirmed}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
