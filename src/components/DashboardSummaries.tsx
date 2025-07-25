import React, { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, Calendar, Clock, Mic } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../types/user';
import { formatDateTime } from '../utils/dateFormatter';

interface DashboardSummariesProps {
  currentUser: AuthUser;
  refreshTrigger: number;
  onNavigateToPatients: () => void;
  onNavigateToSessions: () => void;
  onNavigateToAdmin?: () => void;
  onStartNewConsultation: () => void;
}

interface DashboardData {
  totalPatients: number;
  totalSessions: number;
  totalUsers?: number;
  recentSessions: Array<{
    id: string;
    title: string;
    patient_name: string;
    created_at: string;
    status: string;
  }>;
}

export default function DashboardSummaries({ 
  currentUser, 
  refreshTrigger,
  onNavigateToPatients, 
  onNavigateToSessions,
  onNavigateToAdmin,
  onStartNewConsultation
}: DashboardSummariesProps) {
  const [data, setData] = useState<DashboardData>({
    totalPatients: 0,
    totalSessions: 0,
    totalUsers: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser.profile.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  // Recarregar dados quando refreshTrigger mudar
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 [DashboardSummaries] Recarregando dados devido ao refreshTrigger:', refreshTrigger);
      fetchDashboardData();
    }
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (isAdmin) {
        await fetchAdminData();
      } else {
        await fetchUserData();
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    console.log('🔄 [DashboardSummaries] Buscando dados do admin...');
    
    // Buscar total de usuários
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Buscar total de pacientes
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    // Buscar sessões por status
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id');

    // Buscar sessões recentes
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        created_at,
        status,
        patient:patients(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const dashboardData = {
      totalUsers: usersCount || 0,
      totalPatients: patientsCount || 0,
      totalSessions: sessions?.length || 0,
      recentSessions: recentSessions?.map(session => ({
        id: session.id,
        title: session.title,
        patient_name: session.patient?.name || 'Paciente não encontrado',
        created_at: session.created_at,
        status: session.status
      })) || []
    };
    
    setData(dashboardData);
  };

  const fetchUserData = async () => {
    console.log('🔄 [DashboardSummaries] Buscando dados do usuário...');
    
    // Buscar pacientes do usuário
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);

    // Buscar sessões do usuário por status
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', currentUser.id);

    // Buscar sessões recentes do usuário
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        created_at,
        status,
        patient:patients(name)
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const dashboardData = {
      totalPatients: patientsCount || 0,
      totalSessions: sessions?.length || 0,
      recentSessions: recentSessions?.map(session => ({
        id: session.id,
        title: session.title,
        patient_name: session.patient?.name || 'Paciente não encontrado',
        created_at: session.created_at,
        status: session.status
      })) || []
    };
    
    setData(dashboardData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recording':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Título do Dashboard */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          {isAdmin ? 'Visão geral do sistema' : 'Resumo das suas atividades'}
        </p>
      </div>

      {/* Cards de Sumário */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total de Usuários (apenas para admin) */}
        {isAdmin && (
          <div 
            onClick={onNavigateToAdmin}
            className="glass-card rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-gray-900">{data.totalUsers}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>Ver detalhes</span>
            </div>
          </div>
        )}

        {/* Total de Pacientes */}
        <div 
          onClick={onNavigateToPatients}
          className="glass-card rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">
                {isAdmin ? 'Total de Pacientes' : 'Meus Pacientes'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{data.totalPatients}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-purple-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>Gerenciar</span>
          </div>
        </div>

        {/* Nova Transcrição */}
        <div 
          onClick={onStartNewConsultation}
          className="glass-card rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105 border-2 border-dashed border-orange-300 hover:border-orange-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Nova Consulta</p>
              <p className="text-lg font-bold text-gray-900">Iniciar Consulta</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Mic className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-orange-600">
            <span className="animate-pulse">●</span>
            <span className="ml-1">Começar agora</span>
          </div>
        </div>
      </div>

      {/* Sessões Recentes */}
      {data.recentSessions.length > 0 && (
        <div className="glass-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sessões Recentes</h3>
                <p className="text-sm text-gray-600">Últimas 5 sessões</p>
              </div>
            </div>
            <button
              onClick={onNavigateToSessions}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-3">
            {data.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{session.title}</p>
                  <p className="text-sm text-gray-600">{session.patient_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(session.created_at)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                  {getStatusText(session.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}