import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, Clock, ArrowLeft, Download, CheckCircle, AlertCircle, Play, Pause, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '../types/session';
import { AuthUser } from '../types/user';
import { formatToDDMM, formatDateTime } from '../utils/dateFormatter';

interface SessionDetailPageProps {
  sessionId: string;
  currentUser: AuthUser;
  onBack: () => void;
}

export default function SessionDetailPage({ sessionId, currentUser, onBack }: SessionDetailPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .eq('id', sessionId)
        .eq('user_id', currentUser.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Sessão não encontrada');
        return;
      }

      setSession(data);
    } catch (error: any) {
      console.error('Erro ao buscar detalhes da sessão:', error);
      setError(error.message || 'Erro ao carregar sessão');
    } finally {
      setLoading(false);
    }
  };

  const exportSession = () => {
    if (!session) return;

    const element = document.createElement('a');
    const content = `Sessão: ${session.title}\nPaciente: ${session.patient?.name}\nData: ${formatDateTimeToDDMMAAAA(session.created_at)}\nDuração: ${session.duration || 'N/A'}\nStatus: ${getStatusText(session.status)}\n\n${session.transcription_content || 'Sem transcrição disponível'}`;
    
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
        return <Play className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Carregando sessão...</h2>
          <p className="text-gray-600 text-sm">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erro ao carregar sessão</h2>
          <p className="text-gray-600 text-sm mb-4">{error || 'Sessão não encontrada'}</p>
          <button
            onClick={onBack}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar às sessões</span>
          </button>
          
          <button
            onClick={exportSession}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-3 rounded-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{session.title}</h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{session.patient?.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatToDDMM(session.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{new Date(session.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="glass-card rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações da Sessão</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Paciente</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{session.patient?.name}</p>
              {session.patient?.email && (
                <p className="text-sm text-gray-600">{session.patient.email}</p>
              )}
              {session.patient?.whatsapp && (
                <p className="text-sm text-gray-600">{session.patient.whatsapp}</p>
              )}
            </div>
          </div>

          {/* Session Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Detalhes</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(session.status)}`}>
                  {getStatusIcon(session.status)}
                  <span>{getStatusText(session.status)}</span>
                </span>
              </div>
              
              {session.duration && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duração:</span>
                  <span className="text-sm font-medium text-gray-900">{session.duration}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Criada em:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(session.created_at)}
                </span>
              </div>
              
              {session.start_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Iniciada em:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(session.start_time)}
                  </span>
                </div>
              )}
              
              {session.end_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Finalizada em:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(session.end_time)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transcription */}
      <div className="glass-card rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Transcrição</h2>
          {session.transcription_content && (
            <span className="text-sm text-gray-500">
              {session.transcription_content.length} caracteres
            </span>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
          {session.transcription_content ? (
            <div className="prose max-w-none">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                {session.transcription_content}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium mb-1">Nenhuma transcrição disponível</p>
              <p className="text-sm">A transcrição aparecerá aqui quando a sessão for gravada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}