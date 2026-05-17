import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/admin/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error(err);
      setError('Error cargando tenants');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/tenants', { 
        id: newTenantId, 
        name: newTenantName,
        admin_email: newAdminEmail,
        admin_password: newAdminPassword
      });
      setNewTenantId('');
      setNewTenantName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      fetchTenants();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creando tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este tenant? Toda su información se perderá irremediablemente.')) {
      return;
    }
    try {
      await api.delete(`/admin/tenants/${id}`);
      fetchTenants();
    } catch (err) {
      setError('Error eliminando tenant');
    }
  };

  const handleAdministrar = (id) => {
    localStorage.setItem('admin_target_tenant', id);
    navigate('/');
  };

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('is_superuser');
      localStorage.removeItem('admin_target_tenant');
      navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Súper Administrador</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition shadow-sm">Cerrar Sesión</button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6 border border-red-300 font-medium">{error}</div>}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Aprovisionar Nuevo Cliente (Tenant)</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">ID Único</label>
              <input type="text" required value={newTenantId} onChange={e => setNewTenantId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ej: mi-empresa" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Nombre Comercial</label>
              <input type="text" required value={newTenantName} onChange={e => setNewTenantName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="ej: Mi Empresa S.A." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Email del Cliente</label>
              <input type="email" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="admin@cliente.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Clave de Acceso</label>
              <input type="password" required minLength="6" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none transition" placeholder="••••••" />
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-2 rounded-lg hover:shadow-lg transform transition disabled:opacity-50">
                {loading ? 'Creando...' : 'Desplegar'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="px-6 py-4 font-bold">Identificador de Schema</th>
                <th className="px-6 py-4 font-bold">Nombre del Cliente</th>
                <th className="px-6 py-4 font-bold text-right">Opciones Multi-tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-indigo-50 transition">
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">{t.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{t.name}</td>
                  <td className="px-6 py-4 flex justify-end gap-3">
                    <button onClick={() => handleAdministrar(t.id)} className="text-white bg-indigo-600 font-medium hover:bg-indigo-700 px-4 py-1.5 rounded-lg shadow-sm transition">Administrar Portal</button>
                    {t.id !== 'alpha' && t.id !== 'beta' && (
                        <button onClick={() => handleDelete(t.id)} className="text-red-500 font-medium hover:bg-red-50 px-4 py-1.5 rounded-lg transition">Eliminar Data</button>
                    )}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500 font-medium">No hay clientes registrados en el sistema global.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
