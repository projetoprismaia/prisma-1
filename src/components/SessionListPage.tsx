import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Play, Pause, Square, Clock, User, Calendar, Filter, Download, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '../types/session';
import { Patient } from '../types/patient';
import { AuthUser } from '../types/user';
import { formatToDDMM, formatDateTimeShort, formatDateTime } from '../utils/dateFormatter';
import { dataCache, cacheKeys } from '../utils/dataCache';

interface SessionListPageProps {
  currentUser: AuthUser;
  refreshTrigger: number;
  initialPatientFilter?: string;
  onViewSession: (sessionId: string) => void;
  onStartNewConsultation: () => void;
}

// Add debug logging
const DEBUG = true;
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[SessionListPage] ${message}`, data);
  }
};

export default function SessionListPage({ currentUser, refreshTrigger, initialPatientFilter, onViewSession, onStartNewConsultation }: SessionListPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchSessions();
    fetchPatients();
  }, []);

  // Recarregar dados quando refreshTrigger mudar
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 [SessionListPage] Recarregando dados devido ao refreshTrigger:', refreshTrigger);
      fetchSessions();
      fetchPatients();
    }
  }, [refreshTrigger]);

  // Update selected patient when initialPatientFilter changes
  useEffect(() => {
    if (initialPatientFilter) {
      setSelectedPatient(initialPatientFilter);
    }
  }, [initialPatientFilter]);

  const fetchSessions = async () => {
    try {
      log('Iniciando busca de sessões...');
      
      const cacheKey = cacheKeys.sessions(currentUser.id);
      
      // Implementar padrão SWR - mostrar dados do cache imediatamente
      const cachedSessions = dataCache.get<Session[]>(cacheKey);
      const isDataStale = dataCache.isStale(cacheKey);
      
      if (cachedSessions) {
        console.log(`📄 [SessionListPage] Usando sessões do cache (${isDataStale ? 'STALE' : 'FRESH'})`);
        setSessions(cachedSessions);
        setLoading(false);
      }
      
      // Se dados estão stale ou não existem, buscar dados frescos
      if (isDataStale || !cachedSessions) {
        await fetchSessionsFresh(cacheKey);
      }
    } catch (error) {
      log('Erro ao buscar sessões:', error);
    } finally {
      if (!dataCache.get(cacheKeys.sessions(currentUser.id))) {
        setLoading(false);
      }
    }
  };

  const fetchSessionsFresh = async (cacheKey: string) => {
    try {
      log('🔄 [SessionListPage] Buscando sessões frescas...');
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const sessions = data || [];
      log('Sessões encontradas:', sessions);
      
      // Armazenar no cache
      dataCache.set(cacheKey, sessions);
      setSessions(sessions);
    } catch (error) {
      log('Erro ao buscar sessões frescas:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      log('Iniciando busca de pacientes...');
      
      const cacheKey = cacheKeys.patients(currentUser.id);
      
      // Implementar padrão SWR - mostrar dados do cache imediatamente
      const cachedPatients = dataCache.get<Patient[]>(cacheKey);
      const isDataStale = dataCache.isStale(cacheKey);
      
      if (cachedPatients) {
        console.log(`👥 [SessionListPage] Usando pacientes do cache (${isDataStale ? 'STALE' : 'FRESH'})`);
        setPatients(cachedPatients);
      }
      
      // Se dados estão stale ou não existem, buscar dados frescos
      if (isDataStale || !cachedPatients) {
        await fetchPatientsFresh(cacheKey);
      }
    } catch (error) {
      log('Erro ao buscar pacientes:', error);
    }
  };

  const fetchPatientsFresh = async (cacheKey: string) => {
    try {
      log('🔄 [SessionListPage] Buscando pacientes frescos...');
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');

      if (error) throw error;
      
      const patients = data || [];
      log('Pacientes encontrados:', patients);
      
      // Armazenar no cache
      dataCache.set(cacheKey, patients);
      setPatients(patients);
    } catch (error) {
      log('Erro ao buscar pacientes frescos:', error);
    }
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
      <div className="glass-card rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Sessões</h2>
              <p className="text-sm text-gray-600">Gerencie suas sessões de consulta</p>
            </div>
          </div>
          <button
            onClick={onStartNewConsultation}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Consulta</span>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Total</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">{sessions.length}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Square className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 mt-1">
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
                  onClick={onStartNewConsultation}
                  className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Criar primeira consulta
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
                    <p className="text-lg font-semibold text-gray-900 flex items-center mb-1">
                      <User className="h-5 w-5 mr-2" />
                      {session.patient?.name}
                    </p>
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="text-sm text-gray-600">{session.title}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(session.status)}`}>
                        {getStatusIcon(session.status)}
                        <span>{getStatusText(session.status)}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <p className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatToDDMM(session.created_at)}
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
                    onClick={() => onViewSession(session.id)}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    title="Visualizar sessão"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => exportSession(session)}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
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
    </>
  );
}