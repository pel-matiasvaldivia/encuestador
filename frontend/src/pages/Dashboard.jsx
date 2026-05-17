import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [stats, setStats] = useState(null);
  const [latestResponses, setLatestResponses] = useState([]);
  const [tenantName, setTenantName] = useState('');
  const tenantId = localStorage.getItem('tenant_id');

  useEffect(() => {
    fetchCampaigns();
    api.get('/settings/').then(res => setTenantName(res.data.company_name)).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchStats();
      fetchLatest();

      // WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/dashboard/ws/${tenantId}/${selectedCampaign}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'new_response') {
          fetchStats();
          fetchLatest();
        }
      };

      return () => ws.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns/');
      setCampaigns(res.data);
      if (res.data.length > 0) setSelectedCampaign(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/dashboard/${selectedCampaign}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLatest = async () => {
    try {
      const res = await api.get(`/dashboard/${selectedCampaign}/latest`);
      setLatestResponses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = stats ? Object.entries(stats.promedio_por_pregunta).map(([k, v]) => ({
    name: k,
    estrellas: v
  })) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-700">SatisfApp</h1>
        <div className="flex gap-4">
          <Link to="/campaigns" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Campañas</Link>
          <Link to="/settings" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">⚙️ Configuración</Link>
          <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="text-red-500 hover:text-red-700 font-medium transition-colors">Salir</button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Dashboard {tenantName && <span className="text-purple-600 block sm:inline mt-2 sm:mt-0 sm:ml-2">| {tenantName}</span>}
          </h2>
          <select  
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            {campaigns.length === 0 && <option value="">Sin campañas</option>}
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KpiCard title="Enviados" value={stats.total_enviados} color="text-blue-600" />
              <KpiCard title="Respondidos" value={stats.total_respondidos} color="text-green-600" />
              <KpiCard title="Tasa Respuesta" value={`${stats.tasa_respuesta}%`} color="text-purple-600" />
              <KpiCard title="NPS Estimado" value={stats.nps} color={stats.nps > 0 ? "text-green-600" : "text-red-600"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Promedio por Pregunta</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} allowDecimals={true} tickCount={6} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(val) => `${val} ⭐`} />
                      <Bar dataKey="estrellas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Últimas Respuestas</h3>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {latestResponses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay respuestas aún</p>
                  ) : (
                    latestResponses.map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                        <div>
                          <p className="font-semibold text-gray-800">{r.nombre}</p>
                          {(r.empresa || r.cuit) && (
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                              {r.empresa || 'Sin empresa'} {r.cuit && <span className="opacity-75 relative bottom-0.5 text-[0.65rem] bg-indigo-100 px-1 py-0.5 rounded ml-1">{r.cuit}</span>}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(r.hora).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-bold">
                          {r.promedio} ⭐
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`text-4xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
