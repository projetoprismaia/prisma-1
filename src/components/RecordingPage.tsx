import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Square, Save, ArrowLeft, Clock, User, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../types/user';
import { Session } from '../types/session';
import { useNotification } from '../hooks/useNotification';

interface RecordingPageProps {
  currentUser: AuthUser;
  patientId: string;
  sessionTitle: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function RecordingPage({ 
  currentUser, 
  patientId, 
  sessionTitle, 
  onComplete, 
  onCancel 
}: RecordingPageProps) {
  const { showSuccess, showError } = useNotification();
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState('00:00:00');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [patientName, setPatientName] = useState('');
  
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
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
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
          if (event.error !== 'no-speech') {
            showError(
              'Erro na Transcrição',
              'Ocorreu um erro no reconhecimento de voz. Verifique se o microfone está funcionando.'
            );
          }
        };
      }
    } else {
      setIsSupported(false);
    }

    // Fetch patient name
    fetchPatientName();
    
    // Create session and start recording automatically
    createSessionAndStart();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
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

  const fetchPatientName = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('name')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      setPatientName(data.name);
    } catch (error) {
      console.error('Erro ao buscar nome do paciente:', error);
      setPatientName('Paciente não encontrado');
    }
  };

  const createSessionAndStart = async () => {
    if (!isSupported) {
      showError(
        'Navegador Não Suportado',
        'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.'
      );
      return;
    }

    try {
      console.log('🔄 Criando nova sessão...', { patientId, sessionTitle });
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          patient_id: patientId,
          user_id: currentUser.id,
          title: sessionTitle,
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
      
      // Start recording automatically
      startRecording();
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      showError(
        'Erro ao Criar Sessão',
        'Não foi possível criar a sessão. Tente novamente.'
      );
    }
  };

  const startRecording = () => {
    if (recognitionRef.current && isSupported) {
      setTranscript('');
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(new Date());
      setDuration('00:00:00');
      recognitionRef.current.start();
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
    if (!currentSession) {
      console.warn('⚠️ Não há sessão ativa para salvar');
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
          transcription_content: transcript || 'Nenhuma transcrição foi capturada.'
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      console.log('✅ Sessão salva com sucesso!');
      
      showSuccess(
        'Sessão Salva!',
        'A sessão foi salva com sucesso e está vinculada ao paciente.'
      );
      
      // Complete the recording session
      onComplete();
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error);
      showError(
        'Erro ao Salvar',
        'Não foi possível salvar a sessão. Verifique sua conexão e tente novamente.'
      );
    }
  };

  const handleCancel = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onCancel();
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Navegador não suportado</h1>
          <p className="text-gray-600 mb-6">
            Seu navegador não suporta a API de reconhecimento de voz. 
            Por favor, use o Google Chrome ou Microsoft Edge.
          </p>
          <button
            onClick={handleCancel}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="bg-red-600 p-2 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gravação em Andamento</h1>
                  <p className="text-sm text-gray-600">{sessionTitle}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold text-lg">{duration}</span>
              </div>
              
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Recording Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sessão Ativa</h2>
                  <p className="text-gray-600">{patientName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Título:</span>
                  <p className="font-medium">{sessionTitle}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duração:</span>
                  <p className="font-medium font-mono">{duration}</p>
                </div>
                <div>
                  <span className="text-gray-500">Caracteres:</span>
                  <p className="font-medium">{transcript.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">Início:</span>
                  <p className="font-medium">
                    {startTime ? startTime.toLocaleTimeString('pt-BR') : '--:--'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Controles de Gravação</h2>
              
              <div className="flex items-center justify-center space-x-4">
                {!isPaused ? (
                  <button
                    onClick={pauseRecording}
                    disabled={!isRecording}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
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
                  disabled={!isRecording}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                  <Square className="h-5 w-5" />
                  <span>Finalizar</span>
                </button>
              </div>
            </div>

            {/* Transcript Area */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Transcrição em Tempo Real</h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {isRecording && !isPaused ? 'Ouvindo...' : 'Pausado'}
                  </span>
                </div>
              </div>
              
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="A transcrição aparecerá aqui em tempo real conforme você fala..."
                className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: 'monospace' }}
              />
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{transcript.length} caracteres</span>
                <span>Auto-save a cada 30 segundos</span>
              </div>
            </div>
          </div>

          {/* Sidebar - Recording Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Gravação</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paciente</p>
                    <p className="font-medium">{patientName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sessão</p>
                    <p className="font-medium">{sessionTitle}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duração</p>
                    <p className="font-medium font-mono">{duration}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Mic className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Dicas de Gravação</h3>
              </div>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Fale claramente e em ritmo normal</li>
                <li>• Evite ruídos de fundo</li>
                <li>• A transcrição é salva automaticamente</li>
                <li>• Use "Pausar" para interrupções</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}