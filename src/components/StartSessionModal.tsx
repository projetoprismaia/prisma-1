import React, { useState } from 'react';
import { X, User, FileText, Mic, AlertCircle, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types/patient';
import { AuthUser } from '../types/user';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (patientId: string, title: string) => void;
  currentUser: AuthUser;
}

export default function StartSessionModal({ 
  isOpen, 
  onClose, 
  onStart, 
  currentUser
}: StartSessionModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [errors, setErrors] = useState<{ patient?: string; title?: string }>({});

  // Fetch patients when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { patient?: string; title?: string } = {};

    if (!selectedPatient) {
      newErrors.patient = 'Selecione um paciente';
    }

    if (!sessionTitle.trim()) {
      newErrors.title = 'Digite um título para a sessão';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (validateForm()) {
      onStart(selectedPatient, sessionTitle.trim());
      // Reset form
      setSelectedPatient('');
      setSessionTitle('');
      setErrors({});
    }
  };

  const handleClose = () => {
    setSelectedPatient('');
    setSessionTitle('');
    setErrors({});
    onClose();
  };

  // Generate default title based on current date/time
  const generateDefaultTitle = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `Consulta ${date} ${time}`;
  };

  React.useEffect(() => {
    if (isOpen && !sessionTitle) {
      setSessionTitle(generateDefaultTitle());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="glass-card rounded-xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Play className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Iniciar Nova Sessão</h2>
              <p className="text-sm text-gray-600">Configure a sessão de transcrição</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando pacientes...</p>
            </div>
          ) : (
            <>
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  if (errors.patient) {
                    setErrors(prev => ({ ...prev, patient: undefined }));
                  }
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white transition-colors ${
                  errors.patient ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione um paciente</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.patient && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.patient}
              </p>
            )}
            {patients.length === 0 && (
              <p className="mt-1 text-sm text-amber-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Você precisa cadastrar pelo menos um paciente primeiro
              </p>
            )}
          </div>

          {/* Session Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Sessão *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => {
                  setSessionTitle(e.target.value);
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: undefined }));
                  }
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ex: Consulta de acompanhamento"
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Recording Device Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Mic className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Dispositivo de Gravação</span>
            </div>
            <p className="text-sm text-blue-700">
              Será usado o microfone padrão do seu navegador. Certifique-se de que está funcionando corretamente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleStart}
              disabled={patients.length === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Iniciar Gravação</span>
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}