import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function Survey() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('c');
  
  const [data, setData] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [step, setStep] = useState('personal_info');
  const [personalData, setPersonalData] = useState({
    nombre: '',
    apellido: '',
    razon_social: '',
    sector: '',
    cuit: ''
  });

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await axios.get(`/api/survey/${token}`);
        setData(res.data);
        if (res.data.needs_personal_info === false) {
          setStep(0);
        }
      } catch (err) {
        setError('Encuesta no disponible o ya fue respondida.');
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [token]);

  const handleSelect = (rating) => {
    setResponses({ ...responses, [`pregunta_${step + 1}`]: rating });
    if (step < data.preguntas.length - 1) {
      setTimeout(() => setStep(step + 1), 300);
    } else {
      submitSurvey({ ...responses, [`pregunta_${step + 1}`]: rating });
    }
  };

  const submitSurvey = async (finalResponses) => {
    setLoading(true);
    try {
      await axios.post(`/api/survey/${token}?c=${campaignId}`, { ...finalResponses, ...personalData });
      setSuccess(true);
    } catch (err) {
      setError('Error al guardar las respuestas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><div className="bg-red-100 text-red-700 p-6 rounded-xl max-w-md w-full text-center shadow-sm">{error}</div></div>;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center transform transition-all duration-500 scale-100">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">¡Gracias!</h2>
          <p className="text-gray-500 font-medium">Sus respuestas nos ayudan a mejorar.</p>
        </div>
      </div>
    );
  }

  const progress = ((step) / data.preguntas.length) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10 flex flex-col items-center">
          {data.logo_url && <img src={data.logo_url} alt="Logo de Empresa" className="h-20 w-auto mb-4 object-contain shadow-sm rounded-lg" />}
          {data.company_name && <h2 className="text-3xl font-extrabold text-purple-700 mb-6">{data.company_name}</h2>}
          <h1 className="text-xl text-gray-500 font-medium">Hola, <span className="font-bold text-gray-800">{data.contacto}</span></h1>
          <p className="text-gray-400 mt-1">Queremos conocer su opinión</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
          {step === 'personal_info' ? (
            <div className="p-10 md:p-14">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Datos de Contacto</h2>
              <p className="text-gray-500 text-center mb-8 text-sm">Por favor, complete estos datos antes de comenzar. Son necesarios para validar la encuesta.</p>
              <form onSubmit={(e) => { e.preventDefault(); setStep(0); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                    <input required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" value={personalData.nombre} onChange={e => setPersonalData({...personalData, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido</label>
                    <input required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" value={personalData.apellido} onChange={e => setPersonalData({...personalData, apellido: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Empresa / Razón Social</label>
                  <input required className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" value={personalData.razon_social} onChange={e => setPersonalData({...personalData, razon_social: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CUIT / DNI</label>
                    <input required placeholder="00-00000000-0" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" value={personalData.cuit} onChange={e => setPersonalData({...personalData, cuit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sector / Área</label>
                    <input required placeholder="Ej: Ventas" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" value={personalData.sector} onChange={e => setPersonalData({...personalData, sector: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all mt-6">Continuar</button>
              </form>
            </div>
          ) : (
            <>
              <div className="h-2 bg-gray-100 w-full">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              
              <div className="p-10 md:p-14">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-12 min-h-[5rem] flex items-center justify-center">
                  {data.preguntas[step]}
                </h2>
                
                <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleSelect(star)}
                      className="group relative w-12 h-12 md:w-16 md:h-16 outline-none focus:outline-none"
                    >
                      <svg 
                        className={`w-full h-full transform transition-all duration-200 group-hover:scale-110 group-hover:text-yellow-400 ${
                          responses[`pregunta_${step + 1}`] === star ? 'text-yellow-400 scale-110' : 'text-gray-200'
                        }`} 
                        fill="currentColor" viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-6 px-4 uppercase font-bold tracking-wider">
                  <span>Muy Malo</span>
                  <span>Excelente</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {step !== 'personal_info' && (
          <div className="text-center mt-6 text-sm text-gray-400 font-medium">
            Pregunta {step + 1} de {data.preguntas.length}
          </div>
        )}
      </div>
    </div>
  );
}
