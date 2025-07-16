import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Play, Pause, Square, Clock, User, Calendar, Filter, Download, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '../types/session';
import { Patient } from '../types/patient';
import StartSessionModal from './StartSessionModal';

interface SessionListPageProps {
  currentUser: AuthUser;
  onStartRecording: (patientId: string, title: string) => void;
  initialPatientFilter?: string;
}

// Add debug logging
const DEBUG = true;
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[SessionListPage] ${message}`, data);
  }
}

export default function SessionListPage({ currentUser, onStartRecording, initialPatientFilter }: SessionListPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchPatients();
  }, []);

  // Update selected patient when initialPatientFilter changes
  useEffect(() => {
    if (initialPatientFilter) {
      setSelectedPatient(initialPatientFilter);
    }
  }, [initialPatientFilter]);

  const fetchSessions = async () => {
    try {
      log('Iniciando busca de sessões...');
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      log('Sessões encontradas:', data);
      setSessions(data || []);
    } catch (error) {
      log('Erro ao buscar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      log('Iniciando busca de pacientes...');
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');

      if (error) throw error;
      log('Pacientes encontrados:', data);
      setPatients(data || []);
    } catch (error) {
      log('Erro ao buscar pacientes:', error);
    }
  };

  const handleStartSession = async (patientId: string, title: string) => {
    log('Iniciando nova sessão:', { patientId, title });
    setShowStartModal(false);
    onStartRecording(patientId, title);
  };

  const exportSession = (session: Session) => {
    const element = document.createElement('a');
    const content = `Sessão: ${session.title}\nPaciente: ${session.patient?.name}\nData: ${new Date(session.created_at).toLocaleString('pt-BR')}\nDuração: ${session.duration}\nStatus: ${getStatusText(session.status)}\n\n${session.transcription_content || 'Sem transcrição disponível'}`;
    
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `sessao-${session.title.replace(/[/,:\s]/g, '-')}-${new Date(session.created_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'recording':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'recording':
        return <Play className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      case 'completed':
        return <Square className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'recording':
        return 'Gravando';
      case 'paused':
        return 'Pausada';
      case 'completed':
        return 'Concluída';
      default:
        return 'Desconhecido';
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.transcription_content?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPatient = selectedPatient === 'all' || session.patient_id === selectedPatient;
    
    const matchesDate = !dateFilter || 
                       new Date(session.created_at).toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesPatient && matchesDate;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Sessões de Transcrição</h2>
              <p className="text-sm text-gray-600">Gerencie suas sessões de consulta</p>
            </div>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Sessão</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, paciente ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos os pacientes</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">Total</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{sessions.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Square className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {sessions.filter(s => s.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Lista de Sessões */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm || selectedPatient !== 'all' || dateFilter 
                  ? 'Nenhuma sessão encontrada com os filtros aplicados' 
                  : 'Nenhuma sessão criada ainda'
                }
              </p>
              {!searchTerm && selectedPatient === 'all' && !dateFilter && (
                <button
                  onClick={() => setShowStartModal(true)}
                  className="mt-3 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Criar primeira sessão
                </button>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-gray-900">{session.title}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(session.status)}`}>
                        {getStatusIcon(session.status)}
                        <span>{getStatusText(session.status)}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {session.patient?.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <p className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(session.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(session.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {session.duration && (
                        <p className="flex items-center">
                          <span className="mr-1">⏱️</span>
                          {session.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                    title="Visualizar sessão"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => exportSession(session)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Exportar sessão"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <StartSessionModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          onStart={handleStartSession}
          currentUser={currentUser}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{selectedSession.title}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedSession.patient?.name} • {new Date(selectedSession.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(selectedSession.status)}`}>
                    {getStatusIcon(selectedSession.status)}
                    <span>{getStatusText(selectedSession.status)}</span>
                  </span>
                  {selectedSession.duration && (
                    <span>Duração: {selectedSession.duration}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Transcrição:</h3>
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
                    {selectedSession.transcription_content || 'Nenhuma transcrição disponível ainda.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}