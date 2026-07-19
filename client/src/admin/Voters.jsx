import { useState, useEffect } from 'react';

export default function Voters() {
  const [voters, setVoters] = useState([]);

  // Ambil URL backend dari env Vite, jika tidak ada (di lokal) gunakan localhost:3000
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchVoters = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/voters`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        setVoters(await res.json());
      }
    } catch (e) {
      console.warn("API failed, using mock data...");
      setVoters([
        { id: 1, nim: '13523001', name: 'John Doe', is_active: true, has_voted: true },
        { id: 2, nim: '13523002', name: 'Jane Smith', is_active: false, has_voted: false }
      ]);
    }
  };

  useEffect(() => {
    fetchVoters();
  }, []);

  const toggleActivation = async (id, currentStatus) => {
    if (!window.confirm(`Apakah Anda yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} pemilih ini?`)) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/voters/${id}/activate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchVoters();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal mengubah status pemilih');
      }
    } catch (e) {
      alert('Mode simulasi, server tidak merespon.');
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Manajemen Pemilih</h1>
          <p className="dashboard-subtitle">Kelola data mahasiswa yang berhak memberikan suara.</p>
        </div>
      </header>

      <div className="table-container">
        <div className="table-header">
          <h3>Daftar Pemilih Terdaftar</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Status</th>
              <th>Sudah Memilih</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {voters.map(v => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{v.nim}</td>
                <td>{v.name}</td>
                <td>
                  <span className={`status-badge ${v.is_active ? 'status-open' : 'status-closed'}`}>
                    {v.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td>{v.has_voted ? 'Ya' : 'Belum'}</td>
                <td>
                  <button 
                    onClick={() => toggleActivation(v.id, v.is_active)}
                    className={v.is_active ? 'btn btn-outline' : 'btn btn-primary'}
                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                  >
                    {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
            {voters.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '24px' }}>Tidak ada data pemilih.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
