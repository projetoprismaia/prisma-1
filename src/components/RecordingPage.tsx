import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Square, Save, ArrowLeft, Clock, User, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../types/user';
import { Session } from '../types/session';
import { useNotification } from '../hooks/useNotification';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface RecordingPageProps {
  currentUser: AuthUser;
  onComplete: () => void;
  onCancel: () => void;
}

export default function RecordingPage({ 
  currentUser, 
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [sessionConfigured, setSessionConfigured] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasRecordingRef = useRef<boolean>(false);
  const wasPausedRef = useRef<boolean>(false);

  // Speech recognition setup
  useEffect(() => {
    initializeSpeechRecognition();
    requestMicrophonePermission();

    // Fetch patients for selection
    fetchPatients();
    
    // Generate default title
    generateDefaultTitle();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      console.log('👁️ Visibilidade da página mudou:', document.visibilityState);
      
      if (document.visibilityState === 'visible') {
        console.log('🔄 Página voltou a ficar visível, verificando estado da gravação...');
        
        // Se estava gravando antes de sair da aba
        if (wasRecordingRef.current && !wasPausedRef.current) {
          console.log('🎤 Tentando restaurar gravação ativa...');
          setTimeout(() => {
            if (isRecording && !isPaused) {
              reinitializeRecognition();
            }
          }, 500);
        }
      } else {
        // Salvar estado atual quando sair da aba
        wasRecordingRef.current = isRecording;
        wasPausedRef.current = isPaused;
        console.log('💾 Estado salvo:', { wasRecording: wasRecordingRef.current, wasPaused: wasPausedRef.current });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    wasRecordingRef.current = isRecording;
    wasPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

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

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      showError(
        'Erro ao Carregar Pacientes',
        'Não foi possível carregar a lista de pacientes.'
      );
    } finally {
      setLoadingPatients(false);
    }
  };

  const generateDefaultTitle = () => {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setSessionTitle(`Consulta ${date} ${time}`);
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Solicitando permissão do microfone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Permissão do microfone concedida');
      setMicrophonePermission('granted');
      
      // Stop the stream immediately as we only needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ Permissão do microfone negada:', error);
      setMicrophonePermission('denied');
      showError(
        'Permissão Necessária',
        'É necessário permitir o acesso ao microfone para usar a transcrição de voz.'
      );
    }
  };

  const initializeSpeechRecognition = () => {
    // Se já existe uma instância ativa, não criar nova
    if (recognitionRef.current && recognitionRef.current.readyState !== undefined) {
      console.log('🎙️ Speech Recognition já inicializado');
      return;
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('🎙️ Inicializando Speech Recognition...');
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.maxAlternatives = 1;
        
        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech Recognition iniciado');
        };
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update interim transcript for real-time feedback
          setInterimTranscript(interimTranscript);
          
          if (finalTranscript) {
            console.log('📝 Transcrição final:', finalTranscript);
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
          console.error('❌ Erro na transcrição:', event.error);
          
          switch (event.error) {
            case 'no-speech':
              console.log('⚠️ Nenhuma fala detectada');
              break;
            case 'audio-capture':
              showError(
                'Erro de Áudio',
                'Não foi possível capturar áudio. Verifique se o microfone está conectado e funcionando.'
              );
              break;
            case 'not-allowed':
              setMicrophonePermission('denied');
              showError(
                'Permissão Negada',
                'Permissão para usar o microfone foi negada. Permita o acesso nas configurações do navegador.'
              );
              break;
            case 'network':
              showError(
                'Erro de Rede',
                'Erro de conexão durante a transcrição. Verifique sua conexão com a internet.'
              );
              break;
            default:
              showError(
                'Erro na Transcrição',
                `Ocorreu um erro no reconhecimento de voz: ${event.error}`
              );
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log('🔚 Speech Recognition finalizado');
          
          // Restart recognition if still recording and not paused
          if (isRecording && !isPaused && microphonePermission === 'granted') {
            console.log('🔄 Reiniciando Speech Recognition...');
            setTimeout(() => {
              if (isRecording && !isPaused) {
                try {
                  restartRecognition();
                } catch (error) {
                  console.error('Erro ao reiniciar recognition:', error);
                  // Se falhar, tentar reinicializar completamente
                  reinitializeRecognition();
                }
              }
            }, 100);
          }
        };
      }
    } else {
      console.error('❌ Speech Recognition não suportado');
      setIsSupported(false);
    }
  };

  const reinitializeRecognition = () => {
    console.log('🔄 Reinicializando Speech Recognition completamente...');
    
    // Limpar instância anterior
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Erro ao parar recognition anterior:', error);
      }
      recognitionRef.current = null;
    }
    
    // Criar nova instância
    initializeSpeechRecognition();
    
    // Se estava gravando, tentar iniciar novamente
    if (isRecording && !isPaused && microphonePermission === 'granted') {
      setTimeout(() => {
        restartRecognition();
      }, 200);
    }
  };

  const restartRecognition = () => {
    if (!recognitionRef.current) {
      console.log('⚠️ Recognition não existe, reinicializando...');
      reinitializeRecognition();
      return;
    }

    try {
      console.log('🎤 Tentando iniciar recognition...');
      recognitionRef.current.start();
    } catch (error) {
      console.error('❌ Erro ao iniciar recognition:', error);
      // Se falhar, tentar reinicializar
      setTimeout(() => {
        reinitializeRecognition();
      }, 500);
    }
  };

  const createSession = async (patientId: string, title: string) => {
    if (!isSupported) {
      showError(
        'Navegador Não Suportado',
        'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.'
      );
      return;
    }

    try {
      console.log('🔄 Criando nova sessão...', { patientId, title });
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          patient_id: patientId,
          user_id: currentUser.id,
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
      
      setSessionConfigured(true);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      showError(
        'Erro ao Criar Sessão',
        'Não foi possível criar a sessão. Tente novamente.'
      );
    }
  };

  const handleConfigureSession = () => {
    if (!selectedPatientId || !sessionTitle.trim()) {
      showError(
        'Dados Incompletos',
        'Por favor, selecione um paciente e digite um título para a sessão.'
      );
      return;
    }

    createSession(selectedPatientId, sessionTitle.trim());
  };

  const getSelectedPatientName = () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    return patient?.name || 'Selecione um paciente';
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase())
  );

  const startRecording = () => {
    if (!recognitionRef.current) {
      console.log('⚠️ Recognition não inicializado, inicializando...');
      initializeSpeechRecognition();
      
      // Aguardar inicialização antes de continuar
      setTimeout(() => {
        startRecording();
      }, 300);
      return;
    }

    if (recognitionRef.current && isSupported && microphonePermission === 'granted') {
      console.log('▶️ Iniciando gravação...');
      setTranscript('');
      setInterimTranscript('');
      setIsRecording(true);
      setIsPaused(false);
      setHasStarted(true);
      setStartTime(new Date());
      setDuration('00:00:00');
      
      try {
        restartRecognition();
      } catch (error) {
        console.error('Erro ao iniciar recognition:', error);
        // Tentar reinicializar se falhar
        setTimeout(() => {
          reinitializeRecognition();
        }, 500);
      }
    } else if (microphonePermission === 'denied') {
      showError(
        'Permissão Necessária',
        'É necessário permitir o acesso ao microfone para gravar.'
      );
    } else if (!isSupported) {
      showError(
        'Navegador Não Suportado',
        'Seu navegador não suporta reconhecimento de voz.'
      );
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current && isRecording) {
      console.log('⏸️ Pausando gravação...');
      setIsPaused(true);
      
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Erro ao pausar recognition:', error);
      }
      
      setInterimTranscript('');
      
      // Update session status to paused
      if (currentSession) {
        updateSessionStatus('paused');
      }
    }
  };

  const resumeRecording = () => {
    if (!recognitionRef.current) {
      console.log('⚠️ Recognition não existe ao retomar, reinicializando...');
      reinitializeRecognition();
      
      setTimeout(() => {
        resumeRecording();
      }, 300);
      return;
    }

    if (recognitionRef.current && isPaused) {
      console.log('▶️ Retomando gravação...');
      setIsPaused(false);
      
      restartRecognition();
      
      // Update session status back to recording
      if (currentSession) {
        updateSessionStatus('recording');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      console.log('⏹️ Parando gravação...');
      
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Erro ao parar recognition:', error);
      }
      
      setIsRecording(false);
      setIsPaused(false);
      setHasStarted(false);
      setInterimTranscript('');
      
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

  // Show configuration screen if session not configured yet
  if (!sessionConfigured) {
    return (
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="glass-card rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurar Nova Sessão</h1>
                <p className="text-gray-600">Selecione o paciente e configure a sessão</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl shadow-lg p-8">
            {loadingPatients ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando pacientes...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <User className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Nova Sessão de Consulta</h2>
                  <p className="text-gray-600">Configure os dados da sessão antes de iniciar a gravação</p>
                </div>

                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paciente *
                  </label>
                  
                  {/* Search Field */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente pelo nome..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Patient Selector */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Selecione um paciente</option>
                      {filteredPatients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Messages */}
                  {patients.length === 0 ? (
                    <p className="mt-2 text-sm text-amber-600">
                      ⚠️ Você precisa cadastrar pelo menos um paciente primeiro
                    </p>
                  ) : filteredPatients.length === 0 && patientSearchTerm ? (
                    <p className="mt-2 text-sm text-gray-600">
                      🔍 Nenhum paciente encontrado com "{patientSearchTerm}"
                    </p>
                  ) : patientSearchTerm && filteredPatients.length > 0 ? (
                    <p className="mt-2 text-sm text-green-600">
                      ✅ {filteredPatients.length} paciente(s) encontrado(s)
                    </p>
                  ) : null}
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
                      onChange={(e) => setSessionTitle(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ex: Consulta de acompanhamento"
                    />
                  </div>
                </div>

                {/* Microphone Status */}
                <div className={`rounded-lg p-4 ${
                  microphonePermission === 'granted' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Mic className={`h-4 w-4 ${
                      microphonePermission === 'granted' ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      microphonePermission === 'granted' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Status do Microfone
                    </span>
                  </div>
                  <p className={`text-sm ${
                    microphonePermission === 'granted' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {microphonePermission === 'granted' 
                      ? '✅ Microfone autorizado e pronto para uso'
                      : '❌ Permissão do microfone necessária'
                    }
                  </p>
                  {microphonePermission !== 'granted' && (
                    <button
                      onClick={requestMicrophonePermission}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Permitir acesso ao microfone
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfigureSession}
                    disabled={!selectedPatientId || !sessionTitle.trim() || patients.length === 0 || microphonePermission !== 'granted'}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Configurar e Continuar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
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

  if (microphonePermission === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
          <div className="text-red-500 text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Permissão do Microfone Necessária</h1>
          <p className="text-gray-600 mb-6">
            É necessário permitir o acesso ao microfone para usar a transcrição de voz. 
            Clique no ícone do microfone na barra de endereços e permita o acesso.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={requestMicrophonePermission}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header with Recording Info */}
      <div className="glass-card rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          
          <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${
            isRecording && !isPaused 
              ? 'bg-red-100 text-red-800' 
              : isPaused 
              ? 'bg-yellow-100 text-yellow-800'
              : hasStarted 
              ? 'bg-gray-100 text-gray-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span>{isRecording && !isPaused ? 'Gravando' : isPaused ? 'Pausado' : hasStarted ? 'Parado' : 'Pronto para Iniciar'}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-red-600 p-3 rounded-lg">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gravação em Andamento</h1>
              <p className="text-gray-600">{sessionTitle}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 text-gray-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Duração</span>
            </div>
            <span className="font-mono font-bold text-2xl text-gray-900">{duration}</span>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Recording Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Info */}
            <div className="glass-card rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sessão Ativa</h2>
                  <p className="text-gray-600">{getSelectedPatientName()}</p>
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
            <div className="glass-card rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Controles de Gravação</h2>
              
              <div className="flex items-center justify-center space-x-4 flex-wrap gap-2">
                {!hasStarted ? (
                  <button
                    onClick={startRecording}
                    disabled={microphonePermission !== 'granted' || !isSupported}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg flex items-center space-x-3 transition-colors duration-200 shadow-md text-lg font-medium"
                  >
                    <Play className="h-6 w-6" />
                    <span>Iniciar Gravação</span>
                  </button>
                ) : (
                  <>
                    {isRecording && !isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                      >
                        <Pause className="h-5 w-5" />
                        <span>Pausar</span>
                      </button>
                    ) : isPaused ? (
                      <button
                        onClick={resumeRecording}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                      >
                        <Play className="h-5 w-5" />
                        <span>Retomar</span>
                      </button>
                    ) : null}
                    
                    {hasStarted && (
                      <button
                        onClick={stopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                      >
                        <Square className="h-5 w-5" />
                        <span>Finalizar</span>
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Status da gravação */}
              <div className="mt-4 text-center">
                {/* Botão de diagnóstico para problemas */}
                {hasStarted && (!recognitionRef.current || microphonePermission !== 'granted') && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      ⚠️ Problema detectado na gravação
                    </p>
                    <button
                      onClick={reinitializeRecognition}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm"
                    >
                      🔄 Reativar Gravação
                    </button>
                  </div>
                )}
                
                {!hasStarted && microphonePermission === 'granted' && (
                  <p className="text-sm text-gray-600">
                    ✅ Tudo pronto! Clique em "Iniciar Gravação" para começar a transcrição.
                  </p>
                )}
                {!hasStarted && microphonePermission !== 'granted' && (
                  <button
                    onClick={requestMicrophonePermission}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Permitir acesso ao microfone
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Area */}
            <div className="glass-card rounded-xl shadow-lg p-6">
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
                placeholder={hasStarted ? "A transcrição aparecerá aqui em tempo real conforme você fala..." : "Clique em 'Iniciar Gravação' para começar a transcrever sua consulta..."}
                className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: 'monospace' }}
              />
              
              {/* Interim transcript overlay */}
              {interimTranscript && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <span className="font-medium">Ouvindo: </span>
                  <span className="italic">{interimTranscript}</span>
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{transcript.length + interimTranscript.length} caracteres</span>
                <span>{hasStarted ? 'Auto-save a cada 30 segundos' : 'Pronto para iniciar'}</span>
              </div>
            </div>
          </div>

          {/* Sidebar - Recording Info */}
          <div className="space-y-6">
            <div className="glass-card rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Gravação</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paciente</p>
                    <p className="font-medium">{getSelectedPatientName()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sessão</p>
                    <p className="font-medium">{currentSession?.title || sessionTitle}</p>
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
                <li>• Permita o acesso ao microfone quando solicitado</li>
              </ul>
            </div>
            
            {/* Microphone Status */}
            <div className={`rounded-xl p-4 ${
              microphonePermission === 'granted' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Mic className={`h-4 w-4 ${
                  microphonePermission === 'granted' ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`text-sm font-medium ${
                  microphonePermission === 'granted' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isRecording && !isPaused && recognitionRef.current ? 'Ouvindo...' : 
                   isPaused ? 'Pausado' : 
                   hasStarted && !recognitionRef.current ? 'Reconexão necessária' :
                   hasStarted ? 'Parado' : 'Aguardando início'}
                </span>
              </div>
              <p className={`text-sm ${
                microphonePermission === 'granted' ? 'text-green-700' : 'text-red-700'
              }`}>
                {microphonePermission === 'granted' && recognitionRef.current
                  ? '✅ Microfone autorizado e funcionando'
                  : microphonePermission === 'granted' && !recognitionRef.current
                  ? '⚠️ Microfone autorizado, reconectando...'
                  : '❌ Microfone não autorizado'
                }
              </p>
              
              {/* Debug info */}
              {hasStarted && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>Estado: {isRecording ? 'Gravando' : 'Parado'} | {isPaused ? 'Pausado' : 'Ativo'}</p>
                  <p>Recognition: {recognitionRef.current ? 'OK' : 'Desconectado'}</p>
                  <p>Aba ativa: {document.visibilityState}</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}