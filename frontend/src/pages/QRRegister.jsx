
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function QRRegister() {
  const { campaignId } = useParams();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    razon_social: '',
    cuit: '',
    sector: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // We need to know which tenant this campaign belongs to.
      // For simplicity, we search the campaign. 
      // But wait, our API requires tenant_id or searches across all.
      // Let's assume the backend handles lookup if we don't provide tenant_id.
      // In this project, get_tenant_db_dependency usually needs specific tenant.
      // However, for public QR, we might need a public endpoint that finds the tenant.
      
      const res = await axios.post(`/api/survey/qr-register/${campaignId}`, form);
      window.location.href = res.data.survey_url;
    } catch (err) {
      setError('Error al registrarse. Verifique el ID de campaña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Bienvenido</h1>
          <p className="text-gray-500 mt-2">Complete sus datos para comenzar la encuesta</p>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-center text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
              <input 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido</label>
              <input 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Empresa / Razón Social</label>
            <input 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              value={form.razon_social} onChange={e => setForm({...form, razon_social: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">CUIT</label>
            <input 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="00-00000000-0"
              value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sector / Área</label>
            <input 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Ej: Administración, Ventas..."
              value={form.sector} onChange={e => setForm({...form, sector: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Procesando...' : 'Comenzar Encuesta'}
          </button>
        </form>
      </div>
    </div>
  );
}
