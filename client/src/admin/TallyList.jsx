import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TallyList() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deklarasi URL backend
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchElections = async () => {
      try {
        // Disesuaikan dengan baseUrl
        const res = await fetch(`${baseUrl}/api/admin/elections`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setElections(data.filter(el => el.status === 'closed'));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, [baseUrl]);

  const formatElectionCode = (id) => `ELC-2026-${String(id).padStart(2, '0')}`;

  if (loading) {
    return <div className="p-4">Memuat data pemilu...</div>;
  }

  return (
    <div className="tally-container">
      <header className="dashboard-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="dashboard-title">Hasil & Tally</h1>
          <p className="dashboard-subtitle">Pilih pemilu yang sudah ditutup untuk menghitung hasil suara.</p>
        </div>
      </header>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Judul Pemilu</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {elections.map(el => (
              <tr key={el.id}>
                <td>{formatElectionCode(el.id)}</td>
                <td>{el.title}</td>
                <td><span className={`status-badge status-${el.status}`}>{el.status}</span></td>
                <td>
                  <Link to={`/admin/elections/${el.id}/tally`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    Hitung Suara
                  </Link>
                </td>
              </tr>
            ))}
            {elections.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center" style={{ padding: '24px' }}>Tidak ada pemilu dengan status tertutup (closed).</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
