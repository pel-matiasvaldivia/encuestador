
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Survey from './pages/Survey';
import Settings from './pages/Settings';
import QRRegister from './pages/QRRegister';
import AdminTenants from './pages/AdminTenants';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const isSuperadmin = localStorage.getItem('is_superuser') === 'true';
  return (token && isSuperadmin) ? children : <Navigate to="/" />;
};

const EmulationBanner = () => {
  const navigate = useNavigate();
  const adminTargetTenant = localStorage.getItem('admin_target_tenant');
  
  if (!adminTargetTenant) return null;
  
  const stopEmulating = () => {
    localStorage.removeItem('admin_target_tenant');
    navigate('/admin/tenants');
  };
  
  return (
    <div className="bg-red-600 text-white text-center py-2 font-bold shadow-md w-full sticky top-0 z-50 flex justify-center items-center">
      <span>Estás emulando al tenant: <span className="font-mono bg-red-800 px-2 rounded ml-1 mr-4">{adminTargetTenant}</span></span>
      <button 
        onClick={stopEmulating} 
        className="bg-white text-red-600 px-3 py-1 rounded text-sm hover:bg-gray-100 transition shadow-sm font-semibold">
        Detener Emulación
      </button>
    </div>
  );
};

function App() {
  return (
    <Router>
      <EmulationBanner />
      <div className={localStorage.getItem('admin_target_tenant') ? "" : "min-h-screen"}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/s/:token" element={<Survey />} />
          <Route path="/qr/:campaignId" element={<QRRegister />} />
          
          {/* Admin Routes */}
          <Route path="/admin/tenants" element={<SuperAdminRoute><AdminTenants /></SuperAdminRoute>} />

          {/* Normal Routes */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/campaigns" element={<PrivateRoute><Campaigns /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
