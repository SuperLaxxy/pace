import { useState } from 'react';

export default function ElectionControl({ election, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus) => {
    if (newStatus === 'closed') {
      if (!window.confirm('PERINGATAN: Menutup pemilu adalah aksi SATU ARAH. Anda tidak dapat membukanya kembali. Apakah Anda yakin?')) {
        return;
      }
    }

    setLoading(true);
    const res = await fetch(`/api/admin/elections/${election.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    setLoading(false);
    if (res.ok) {
      onUpdate();
    } else {
      const data = await res.json();
      alert(`Gagal memperbarui status: ${data.error}`);
    }
  };

  return (
    <div className="panel control-panel">
      <h3>Kontrol Pemilu</h3>
      <p>Status Saat Ini: <strong>{election.status}</strong></p>
      
      <div className="control-actions">
        {election.status === 'draft' && (
          <button 
            onClick={() => updateStatus('open')} 
            disabled={loading}
            className="btn-primary"
          >
            Buka Pemilu
          </button>
        )}
        
        {election.status === 'open' && (
          <button 
            onClick={() => updateStatus('closed')} 
            disabled={loading}
            className="btn-danger"
          >
            Tutup Pemilu
          </button>
        )}
        
        {election.status === 'closed' && (
          <p className="text-muted">Pemilu ini telah selesai.</p>
        )}
      </div>
    </div>
  );
}
