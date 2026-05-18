import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newCampaign, setNewCampaign] = useState({ nombre: '', canal: 'email' });
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [qrModal, setQrModal] = useState({ open: false, campaignId: '', nombre: '' });
  const [copyStatus, setCopyStatus] = useState({});
  const [editModal, setEditModal] = useState({ open: false, campaign: null });
  const [editForm, setEditForm] = useState({ nombre: '', canal: '' });
  const [domain, setDomain] = useState('');

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    api.get('/settings/').then(res => setDomain(res.data.domain)).catch(e => console.error(e));
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
      setUploadMessage(err.response?.data?.detail || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/campaigns/', newCampaign);
      setNewCampaign({ nombre: '', canal: 'email' });
      setCampaigns([res.data, ...campaigns]);
    } catch (err) {
      alert('Error creando la campaña');
    }
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  const handleLaunch = async (id) => {
    try { await api.post(`/campaigns/${id}/launch`); fetchCampaigns(); fetchContacts(); }
    catch (err) { alert(err.response?.data?.detail || 'Error al lanzar'); }
  };

  const handlePause = async (id) => {
    try { await api.post(`/campaigns/${id}/pause`); fetchCampaigns(); }
    catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleResume = async (id) => {
    try { await api.post(`/campaigns/${id}/resume`); fetchCampaigns(); }
    catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleFinish = async (id) => {
    if (!confirm('¿Finalizar esta campaña? No podrá volver a en curso.')) return;
    try { await api.post(`/campaigns/${id}/finish`); fetchCampaigns(); }
    catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta campaña y todas sus respuestas?')) return;
    try { await api.delete(`/campaigns/${id}`); setCampaigns(campaigns.filter(c => c.id !== id)); }
    catch (err) { alert('Error al eliminar'); }
  };

  const openEdit = (c) => {
    setEditForm({ nombre: c.nombre, canal: c.canal });
    setEditModal({ open: true, campaign: c });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/campaigns/${editModal.campaign.id}`, editForm);
      setCampaigns(campaigns.map(c => c.id === res.data.id ? res.data : c));
      setEditModal({ open: false, campaign: null });
    } catch (err) { alert('Error al editar'); }
  };

  const handleDownloadReport = async (id, nombre) => {
    try {
      const res = await api.get(`/campaigns/${id}/report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${nombre.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { alert('Error al descargar el informe'); }
  };

  const handleCopyLink = (contactId, campaignId) => {
    const baseUrl = domain || window.location.origin;
    const url = `${baseUrl}/s/${contactId}?c=${campaignId}`;
    navigator.clipboard.writeText(url);
    setCopyStatus({ ...copyStatus, [contactId]: true });
    setTimeout(() => setCopyStatus(p => ({ ...p, [contactId]: false })), 2000);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const badgeClass = {
    creada:     'bg-yellow-100 text-yellow-700',
    en_curso:   'bg-green-100 text-green-700',
    pausada:    'bg-orange-100 text-orange-700',
    finalizada: 'bg-gray-200 text-gray-500',
  };
  const estadoLabel = {
    creada: 'Creada', en_curso: 'En Curso', pausada: 'Pausada', finalizada: 'Finalizada'
  };
  const activeCampaign = campaigns.find(c => c.estado === 'en_curso');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-700">SatisfApp</h1>
        <div className="flex gap-4">
          <Link to="/" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Dashboard</Link>
          <Link to="/settings" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">⚙️ Configuración</Link>
          <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="text-red-500 hover:text-red-700 font-medium transition-colors">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Upload */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Cargar Contactos</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
              <input type="file" id="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              <label htmlFor="file" className="cursor-pointer text-purple-600 font-semibold flex flex-col items-center">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                {uploading ? 'Subiendo...' : 'Seleccionar CSV'}
              </label>
            </div>
            {uploadMessage && <p className="mt-3 text-sm text-green-600 font-medium text-center">{uploadMessage}</p>}
          </div>

          {/* New Campaign */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Nueva Campaña</h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <input type="text" required placeholder="Nombre de la campaña"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newCampaign.nombre} onChange={e => setNewCampaign({...newCampaign, nombre: e.target.value})} />
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newCampaign.canal} onChange={e => setNewCampaign({...newCampaign, canal: e.target.value})}>
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

        {/* Main */}
        <div className="lg:col-span-2 space-y-8">

          {/* Campaigns table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Campañas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b text-sm">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Canal</th>
                    <th className="pb-3 font-medium text-center">Estado</th>
                    <th className="pb-3 font-medium text-center">Encuesta</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-semibold text-gray-800">{c.nombre}</td>
                      <td className="py-3 text-gray-600 capitalize text-sm">{c.canal}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeClass[c.estado] || 'bg-gray-100 text-gray-500'}`}>
                          {estadoLabel[c.estado] || c.estado}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {(c.estado === 'en_curso' || c.estado === 'pausada') ? (
                          <button 
                            onClick={() => {
                              const url = `${domain || window.location.origin}/qr/${c.id}`;
                              navigator.clipboard.writeText(url);
                              alert('¡URL de campaña copiada!');
                            }}
                            title="Copiar URL de la campaña"
                            className="p-2 rounded-full text-indigo-600 hover:bg-indigo-50 transition-all inline-flex items-center justify-center border border-indigo-100"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                            </svg>
                          </button>
                        ) : '-'}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end items-center gap-1.5 flex-wrap">

                          {/* ✏️ Edit – not available when finished */}
                          {c.estado !== 'finalizada' && (
                            <button onClick={() => openEdit(c)} title="Editar nombre / canal"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"/>
                              </svg>
                            </button>
                          )}

                          {/* ▶️ Launch */}
                          {c.estado === 'creada' && (
                            <button onClick={() => handleLaunch(c.id)} title="Lanzar campaña"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-md transition-all">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              Lanzar
                            </button>
                          )}

                          {/* ▶️ Resume */}
                          {c.estado === 'pausada' && (
                            <button onClick={() => handleResume(c.id)} title="Reanudar"
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-all">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                          )}

                          {/* ⏸️ Pause */}
                          {c.estado === 'en_curso' && (
                            <button onClick={() => handlePause(c.id)} title="Pausar"
                              className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-all">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            </button>
                          )}

                          {/* ✅ Finish */}
                          {(c.estado === 'en_curso' || c.estado === 'pausada') && (
                            <button onClick={() => handleFinish(c.id)} title="Finalizar campaña"
                              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                              </svg>
                            </button>
                          )}

                          {/* 📱 QR */}
                          {(c.estado === 'en_curso' || c.estado === 'pausada') && (
                            <button onClick={() => setQrModal({ open: true, campaignId: c.id, nombre: c.nombre })} title="Ver QR"
                              className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-all text-xs font-bold border border-indigo-100">
                              QR
                            </button>
                          )}

                          {/* 📥 Report – only finished */}
                          {c.estado === 'finalizada' && (
                            <button onClick={() => handleDownloadReport(c.id, c.nombre)} title="Descargar informe CSV"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                              </svg>
                              Informe
                            </button>
                          )}

                          {/* 🗑️ Delete */}
                          <button onClick={() => handleDelete(c.id)} title="Eliminar campaña"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay campañas creadas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contacts table */}
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
                    <th className="py-2 px-2 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2">{c.nombre} {c.apellido}</td>
                      <td className="py-2 px-2 text-gray-500">{c.razon_social || '-'}</td>
                      <td className="py-2 px-2 text-gray-500">{c.contacto}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          c.estado === 'respondido' ? 'bg-green-100 text-green-700' :
                          c.estado === 'enviado'    ? 'bg-blue-100 text-blue-700'  :
                          'bg-gray-100 text-gray-500'}`}>{c.estado}</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {activeCampaign && (
                          <button onClick={() => handleCopyLink(c.id, activeCampaign.id)}
                            className={`text-xs font-bold px-2 py-1 rounded transition-all ${
                              copyStatus[c.id] ? 'bg-green-500 text-white' : 'text-purple-600 hover:bg-purple-50'
                            }`}>
                            {copyStatus[c.id] ? '¡Copiado!' : 'Copiar Link'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── QR Modal ──────────────────────────────────────────────────────────── */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative">
            <button onClick={() => setQrModal({ ...qrModal, open: false })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h3 className="text-xl font-bold text-gray-800 mb-2">QR de Campaña</h3>
            <p className="text-gray-500 text-sm mb-6">{qrModal.nombre}</p>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-4 flex justify-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${domain || window.location.origin}/qr/${qrModal.campaignId}`)}`}
                alt="QR Code" className="w-48 h-48 rounded-lg shadow-sm" />
            </div>
            
            <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
              <input 
                readOnly 
                className="bg-transparent text-[10px] text-gray-500 font-mono flex-1 outline-none overflow-hidden text-ellipsis"
                value={`${domain || window.location.origin}/qr/${qrModal.campaignId}`}
                onClick={(e) => e.target.select()}
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${domain || window.location.origin}/qr/${qrModal.campaignId}`);
                  alert('¡Enlace copiado!');
                }}
                className="text-purple-600 hover:text-purple-800 font-bold text-[10px] uppercase whitespace-nowrap"
              >
                Copiar
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-6">Escanee este código en el frontdesk o comparta el link para que los clientes realicen la encuesta.</p>
            <button onClick={() => window.print()} className="mt-6 w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Imprimir QR
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative">
            <button onClick={() => setEditModal({ open: false, campaign: null })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Editar Campaña</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Canal</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  value={editForm.canal} onChange={e => setEditForm({...editForm, canal: e.target.value})}>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2 rounded-xl hover:bg-purple-700 transition-colors mt-2">
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
