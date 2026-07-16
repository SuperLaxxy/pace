import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './voter/Register';
import Login from './voter/Login';
import KeySetup from './voter/KeySetup';
import Dashboard from './voter/Dashboard';
import Vote from './voter/Vote';
import Receipt from './voter/Receipt';
import Landing from './landing/Landing';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/Login';
import AdminDashboard from './admin/Dashboard';
import AdminCreateElection from './admin/CreateElection';
import AdminElectionDetails from './admin/ElectionDetails';
import AdminTally from './admin/Tally';
import AdminTallyList from './admin/TallyList';
import AdminVoters from './admin/Voters';
import AdminAuditLog from './admin/AuditLog';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup-key" element={<KeySetup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vote/:electionId/:candidateId" element={<Vote />} />
            <Route path="/receipt/:hash" element={<Receipt />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="elections/create" element={<AdminCreateElection />} />
              <Route path="elections/:id" element={<AdminElectionDetails />} />
              <Route path="elections/:id/tally" element={<AdminTally />} />
              <Route path="tally" element={<AdminTallyList />} />
              <Route path="voters" element={<AdminVoters />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
