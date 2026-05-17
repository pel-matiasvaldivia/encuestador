import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Settings() {
  const [form, setForm] = useState({
    company_name: '', company_phone: '', company_address: '',
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '',
    question_1: '', question_2: '', question_3: '', question_4: '', question_5: '',
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/settings/').then(res => {
      const { logo_url, updated_at, ...rest } = res.data; // eslint-disable-line no-unused-vars
      setForm(f => ({ ...f, ...rest }));
      setLogoUrl(logo_url || '');
    }).catch(() => {});
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'smtp_port' ? Number(value) : value }));
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await api.put('/settings/', form);
      setMessage({ text: '✅ Configuración guardada correctamente.', type: 'success' });
    } catch {
      setMessage({ text: '❌ Error al guardar la configuración.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/settings/logo', fd);
      setLogoUrl(res.data.logo_url);
      setMessage({ text: '✅ Logo subido correctamente.', type: 'success' });
    } catch {
      setMessage({ text: '❌ Error al subir el logo.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const displayLogo = logoPreview || (logoUrl ? `http://localhost:8880${logoUrl}` : null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-700">SatisfApp</h1>
        <div className="flex gap-4 items-center">
          <Link to="/" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Dashboard</Link>
          <Link to="/campaigns" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Campañas</Link>
          <Link to="/settings" className="text-purple-700 font-semibold border-b-2 border-purple-600">⚙️ Configuración</Link>
          <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="text-red-500 hover:text-red-700 font-medium transition-colors">Salir</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8 space-y-8">
        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Company Data */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">🏢 Datos de Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="md:col-span-2 flex items-center gap-6">
                <div
                  onClick={() => fileRef.current.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-purple-300 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors overflow-hidden bg-purple-50 flex-shrink-0"
                >
                  {displayLogo
                    ? <img src={displayLogo} alt="Logo" className="w-full h-full object-contain" />
                    : <span className="text-3xl">🖼️</span>
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Logo de empresa</p>
                  <p className="text-sm text-gray-500 mb-2">PNG, JPG, SVG, WEBP. Recomendado: 200×200px.</p>
                  <button type="button" onClick={() => fileRef.current.click()} className="px-4 py-1.5 bg-purple-100 text-purple-700 font-semibold rounded-lg text-sm hover:bg-purple-200 transition-colors">
                    {uploading ? 'Subiendo...' : 'Cambiar logo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de empresa</label>
                <input name="company_name" value={form.company_name} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Mi Empresa S.A." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input name="company_phone" value={form.company_phone} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="+54 11 1234-5678" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input name="company_address" value={form.company_address} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Av. Corrientes 1234, CABA" />
              </div>
            </div>
          </section>

          {/* SMTP Config */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📧 Configuración SMTP</h2>
            <p className="text-sm text-gray-500 mb-6">Estos datos se usarán para enviar emails de encuesta a tus contactos.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP</label>
                <input name="smtp_host" value={form.smtp_host} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                <input name="smtp_port" type="number" value={form.smtp_port} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="587" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input name="smtp_user" value={form.smtp_user} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="usuario@empresa.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña / App Password</label>
                <input name="smtp_pass" type="password" value={form.smtp_pass} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="••••••••" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email remitente (From)</label>
                <input name="smtp_from" value={form.smtp_from} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="encuestas@empresa.com" />
              </div>
            </div>
          </section>

          {/* Question Template */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📝 Plantilla de Encuesta</h2>
            <p className="text-sm text-gray-500 mb-6">Personaliza las 5 preguntas que tus clientes verán al abrir la encuesta.</p>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta {num}</label>
                  <input 
                    name={`question_${num}`} 
                    value={form[`question_${num}`]} 
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder={`Escriba la pregunta ${num}...`} 
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
