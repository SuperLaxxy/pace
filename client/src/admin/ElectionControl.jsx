import { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function ElectionControl({ election, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus) => {
    if (newStatus === 'closed') {
      if (!window.confirm('PERINGATAN: Menutup pemilu adalah aksi SATU ARAH. Anda tidak dapat membukanya kembali. Apakah Anda yakin?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/elections/${election.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Status ${res.status}: ${text.substring(0, 100)}...`);
      }

      if (res.ok) {
        alert(`Status pemilu berhasil diubah menjadi: ${newStatus.toUpperCase()}`);
        if (onUpdate) onUpdate();
      } else {
        alert(`Gagal memperbarui status: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err) {
      console.error("Error updating election status:", err);
      alert(`Gagal terhubung ke server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel control-panel">
      <h3>Kontrol Pemilu</h3>
      <p>Status Saat Ini: <strong>{election.status}</strong></p>
      
      <div className="control-actions" style={{ marginTop: '12px' }}>
        {election.status === 'draft' && (
          <button 
            onClick={() => updateStatus('open')} 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Memproses...' : 'Buka Pemilu'}
          </button>
        )}
        
        {election.status === 'open' && (
          <button 
            onClick={() => updateStatus('closed')} 
            disabled={loading}
            className="btn btn-danger"
          >
            {loading ? 'Memproses...' : 'Tutup Pemilu'}
          </button>
        )}
        
        {election.status === 'closed' && (
          <p className="text-muted">Pemilu ini telah selesai.</p>
        )}
      </div>
    </div>
  );
}
