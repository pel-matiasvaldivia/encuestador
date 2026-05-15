import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newCampaign, setNewCampaign] = useState({ nombre: '', canal: 'email' });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
  }, []);

  const fetchCampaigns = async () => {
    const res = await api.get('/campaigns/');
    setCampaigns(res.data);
  };

  const fetchContacts = async () => {
    const res = await api.get('/contacts/');
    setContacts(res.data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/contacts/upload', formData);
      setUploadMessage(res.data.message);
      fetchContacts();
    } catch (err) {
      setUploadMessage('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    await api.post('/campaigns/', newCampaign);
    setNewCampaign({ nombre: '', canal: 'email' });
    fetchCampaigns();
  };

  const handleLaunch = async (id) => {
    try {
      await api.post(`/campaigns/${id}/launch`);
      alert('Campaña lanzada!');
      fetchCampaigns();
      fetchContacts();
    } catch (err) {
      alert('Error al lanzar la campaña');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-700">SatisfApp</h1>
        <div className="flex gap-4">
          <Link to="/" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Dashboard</Link>
          <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="text-red-500 hover:text-red-700 font-medium transition-colors">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar Controls */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Cargar Contactos</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
              <input type="file" id="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              <label htmlFor="file" className="cursor-pointer text-purple-600 font-semibold flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                {uploading ? 'Subiendo...' : 'Seleccionar CSV'}
              </label>
            </div>
            {uploadMessage && <p className="mt-3 text-sm text-green-600 font-medium text-center">{uploadMessage}</p>}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Nueva Campaña</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <input 
                type="text" required placeholder="Nombre de la campaña" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newCampaign.nombre} onChange={e => setNewCampaign({...newCampaign, nombre: e.target.value})}
              />
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newCampaign.canal} onChange={e => setNewCampaign({...newCampaign, canal: e.target.value})}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="ambos">Ambos</option>
              </select>
              <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Crear Campaña
              </button>
            </form>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Campañas Activas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Canal</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td className="py-4 font-semibold text-gray-800">{c.nombre}</td>
                      <td className="py-4 text-gray-600 capitalize">{c.canal}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.estado === 'creada' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {c.estado === 'creada' && (
                          <button onClick={() => handleLaunch(c.id)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm hover:shadow-md transition-all">
                            Lanzar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-4 text-gray-500">No hay campañas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              Base de Contactos
              <span className="text-sm font-normal text-gray-500">{contacts.length} contactos</span>
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b bg-gray-50 sticky top-0">
                    <th className="py-2 px-2 font-medium">Nombre</th>
                    <th className="py-2 px-2 font-medium">Empresa</th>
                    <th className="py-2 px-2 font-medium">Contacto</th>
                    <th className="py-2 px-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2">{c.nombre} {c.apellido}</td>
                      <td className="py-2 px-2 text-gray-600">{c.razon_social || '-'}</td>
                      <td className="py-2 px-2 text-gray-600">{c.contacto}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.estado === 'pendiente' ? 'bg-gray-100 text-gray-600' : 
                          c.estado === 'enviado' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
