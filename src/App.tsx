import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Square, Save, Download, Clock, FileText, Settings, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
import AdminPanel from './components/AdminPanel';
import PatientList from './components/PatientList';
import SessionListPage from './components/SessionListPage';
import StartSessionModal from './components/StartSessionModal';
import { Session } from './types/session';

function App() {
  const { user, loading, error, signOut, isAdmin } = useAuth();

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState('00:00:00');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setTranscript(prev => {
              const newTranscript = prev + finalTranscript;
              
              // Auto-save transcription every 30 seconds during recording
              if (currentSession && isRecording && !isPaused) {
                const now = Date.now();
                const lastSave = localStorage.getItem('lastAutoSave');
                if (!lastSave || now - parseInt(lastSave) > 30000) {
                  localStorage.setItem('lastAutoSave', now.toString());
                  updateSessionStatus('recording', false);
                }
              }
              
              return newTranscript;
            });
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Erro na transcrição:', event.error);
        };
      }
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused, startTime]);

  const startRecording = (patientId?: string, title?: string) => {
    if (recognitionRef.current && isSupported) {
      // If no patient selected, we need to show the start session modal
      if (!patientId || !title) {
        // This will be handled by the SessionListPage component
        return;
      }

      // Create session in database
      createSession(patientId, title);
      
      setTranscript('');
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(new Date());
      setDuration('00:00:00');
      recognitionRef.current.start();
    }
  };

  const createSession = async (patientId: string, title: string) => {
    if (!user) return;

    try {
      console.log('🔄 Criando nova sessão...', { patientId, title });
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          patient_id: patientId,
          user_id: user.id,
          title: title,
          status: 'recording',
          start_time: new Date().toISOString(),
          transcription_content: ''
        })
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .single();

      if (error) throw error;
      
      console.log('✅ Sessão criada com sucesso:', data);
      setCurrentSession(data);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      alert('❌ Erro ao criar sessão. Verifique se você tem pacientes cadastrados.');
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      setIsPaused(true);
      recognitionRef.current.stop();
      
      // Update session status to paused
      if (currentSession) {
        updateSessionStatus('paused');
      }
    }
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      setIsPaused(false);
      recognitionRef.current.start();
      
      // Update session status back to recording
      if (currentSession) {
        updateSessionStatus('recording');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Save session with final data
      if (currentSession) {
        saveSessionToDatabase();
      }
    }
  };

  const updateSessionStatus = async (status: 'recording' | 'paused' | 'completed', saveTranscript = false) => {
    if (!currentSession) return;

    try {
      const updateData: any = { status };
      
      // Always update transcription content if there's new content
      if (transcript.trim()) {
        updateData.transcription_content = transcript;
      }
      
      if (status === 'completed' || saveTranscript) {
        updateData.end_time = new Date().toISOString();
        updateData.duration = duration;
      }

      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', currentSession.id);

      if (error) throw error;
      console.log('✅ Status da sessão atualizado:', status);
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
    }
  };

  const saveSessionToDatabase = async () => {
    if (!currentSession || !transcript.trim()) {
      console.warn('⚠️ Não há sessão ativa ou transcrição para salvar');
      return;
    }

    try {
      console.log('💾 Salvando sessão no banco de dados...');
      console.log('📝 Transcrição:', transcript.substring(0, 100) + '...');
      console.log('⏱️ Duração:', duration);
      
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration: duration,
          transcription_content: transcript
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      console.log('✅ Sessão salva com sucesso!');
      
      // Clear current session and transcript after successful save
      setCurrentSession(null);
      setTranscript('');
      setDuration('00:00:00');
      setStartTime(null);
      
      alert('✅ Sessão salva com sucesso no banco de dados!');
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error);
      alert('❌ Erro ao salvar sessão. Tente novamente.');
    }
  };

  const saveTranscription = () => {
    if (currentSession) {
      saveSessionToDatabase();
    }
  };

  const handleStartSession = (patientId: string, title: string) => {
    setShowSessionsPanel(false);
    setShowStartSessionModal(false);
    startRecording(patientId, title);
  };

  const handleSignOut = () => {
    signOut().then(() => {
      // Forçar limpeza adicional do estado local após logout
      setTranscript('');
      setShowAdminPanel(false);
      setShowPatientPanel(false);
      setShowSessionsPanel(false);
      setCurrentSession(null);
    });
  };

  const navigateToHome = () => {
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
  };

  const navigateToAdmin = () => {
    setShowAdminPanel(true);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
  };

  const navigateToPatients = () => {
    setShowAdminPanel(false);
    setShowPatientPanel(true);
    setShowSessionsPanel(false);
  };

  const navigateToSessions = () => {
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Verificando autenticação...</h2>
          <p className="text-gray-600 text-sm">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm />;
  }

  // Browser support check
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Navegador não suportado</h1>
          <p className="text-gray-600">
            Seu navegador não suporta a API de reconhecimento de voz. 
            Por favor, use o Google Chrome ou Microsoft Edge.
          </p>
        </div>
      </div>
    );
  }

  // Show admin panel if requested
  if (showAdminPanel && isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                  <p className="text-sm text-gray-600">Painel Administrativo</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Voltar ao App
                </button>
                <UserProfile user={user} onSignOut={signOut} />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminPanel currentUser={user} />
        </div>
      </div>
    );
  }

  // Show patient panel if requested
  if (showPatientPanel && !isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                  <p className="text-sm text-gray-600">Gerenciamento de Pacientes</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Voltar ao App
                </button>
                <UserProfile user={user} onSignOut={signOut} />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PatientList currentUser={user} />
        </div>
      </div>
    );
  }

  // Show sessions panel if requested
  if (showSessionsPanel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                  <p className="text-sm text-gray-600">Sessões de Transcrição</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Voltar ao App
                </button>
                <UserProfile user={user} onSignOut={signOut} />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SessionListPage currentUser={user} onStartSession={handleStartSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                <p className="text-sm text-gray-600">Transcrição de Consultas Psiquiátricas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold">{duration}</span>
              </div>
              
              {/* Navigation Menu */}
              <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={navigateToHome}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !showAdminPanel && !showPatientPanel
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  <span>Transcrição</span>
                </button>
                
                {!isAdmin() && (
                  <button
                    onClick={navigateToPatients}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      showPatientPanel
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Pacientes</span>
                  </button>
                )}
                
                <button
                  onClick={navigateToSessions}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    showSessionsPanel
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Sessões</span>
                </button>
                
                {isAdmin() && (
                  <button
                    onClick={navigateToAdmin}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      showAdminPanel
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </button>
                )}
              </nav>
              
              <UserProfile user={user} onSignOut={signOut} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Recording Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recording Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Controles de Gravação</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isRecording && !isPaused 
                    ? 'bg-red-100 text-red-800' 
                    : isPaused 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isRecording && !isPaused ? 'Gravando' : isPaused ? 'Pausado' : 'Parado'}
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={() => setShowStartSessionModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                  >
                    <Mic className="h-5 w-5" />
                    <span>Nova Sessão</span>
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    {!isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                      >
                        <Pause className="h-5 w-5" />
                        <span>Pausar</span>
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                      >
                        <Play className="h-5 w-5" />
                        <span>Retomar</span>
                      </button>
                    )}
                    
                    <button
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                    >
                      <Square className="h-5 w-5" />
                      <span>Parar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transcript Area */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Transcrição</h2>
                {transcript && (
                  <button
                    onClick={saveTranscription}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 text-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>Salvar</span>
                  </button>
                )}
              </div>
              
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="A transcrição aparecerá aqui em tempo real..."
                className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            
            {/* Current Session Info */}
            {currentSession && (
              <p className="text-sm text-gray-600 mt-2">Sessão atual: {currentSession.title}</p>
            )}
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h2>
            
            <div className="space-y-3">
              <button
                onClick={navigateToSessions}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Ver Todas as Sessões</span>
              </button>
              
              <button
                onClick={navigateToPatients}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Gerenciar Pacientes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartSessionModal && (
        <StartSessionModal
          isOpen={showStartSessionModal}
          onClose={() => setShowStartSessionModal(false)}
          onStart={handleStartSession}
          currentUser={user}
        />
      )}
    </div>
  );
}

export default App;