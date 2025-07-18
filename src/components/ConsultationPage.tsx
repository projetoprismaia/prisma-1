import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Play, Pause, Square, User, Clock, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types/patient';
import { AuthUser } from '../types/user';
import { useNotification } from '../hooks/useNotification';
import { formatDateTimeShort } from '../utils/dateFormatter';

interface ConsultationPageProps {
  currentUser: AuthUser;
  isTabVisible: boolean;
  onBack: () => void;
}

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'completed';

interface AudioDevice {
  deviceId: string;
  label: string;
}

export default function ConsultationPage({ currentUser, isTabVisible, onBack }: ConsultationPageProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [transcriptionContent, setTranscriptionContent] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showSuccess, showError, showWarning } = useNotification();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-generate session title when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      const selectedPatientData = patients.find(p => p.id === selectedPatient);
      if (selectedPatientData) {
        const now = new Date();
        const formattedDateTime = formatDateTimeShort(now);
        const autoTitle = `${selectedPatientData.name} - ${formattedDateTime}`;
        setSessionTitle(autoTitle);
      }
    } else {
      setSessionTitle('');
    }
  }, [selectedPatient, patients]);

  useEffect(() => {
    fetchPatients();
    fetchAudioDevices();
    initializeSpeechRecognition();
    
    return () => {
      cleanup();
    };
  }, []);

  // Gerenciar gravação baseado na visibilidade da aba
  useEffect(() => {
    if (!isTabVisible && (recordingStatus === 'recording' || recordingStatus === 'paused')) {
      console.log('🙈 [ConsultationPage] Aba ficou oculta durante gravação - pausando automaticamente');
      
      if (recordingStatus === 'recording') {
        // Pausar automaticamente se estava gravando
        pauseRecording();
        showWarning(
          'Consulta Pausada Automaticamente',
          'A gravação foi pausada porque a aba perdeu o foco. Clique em "Continuar" para retomar.'
        );
      }
    } else if (isTabVisible && recordingStatus === 'paused') {
      console.log('👁️ [ConsultationPage] Aba voltou a ficar visível enquanto pausada - retomando automaticamente');
      resumeRecording();
      showSuccess(
        'Consulta Retomada Automaticamente',
        'A gravação foi retomada porque a aba voltou a ficar visível.'
      );
    }
  }, [isTabVisible, recordingStatus]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      console.log('🔄 [ConsultationPage] Buscando pacientes...');
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');

      if (error) throw error;
      
      const patients = data || [];
      console.log('👥 [ConsultationPage] Pacientes encontrados:', patients.length);
      setPatients(patients);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      showError('Erro', 'Não foi possível carregar a lista de pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAudioDevices = async () => {
    try {
      console.log('🔄 [ConsultationPage] Buscando dispositivos de áudio...');
      
      // Solicitar permissão para acessar microfone primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.slice(0, 8)}`
        }));

      console.log('🎤 [ConsultationPage] Dispositivos encontrados:', audioInputs.length);
      setAudioDevices(audioInputs);
      
      // Selecionar o primeiro dispositivo por padrão
      if (audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Erro ao buscar dispositivos de áudio:', error);
      showError('Erro', 'Não foi possível acessar os dispositivos de áudio. Verifique as permissões.');
    }
  };

  const initializeSpeechRecognition = () => {
    // Verificar se o navegador suporta Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
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

        if (finalTranscript) {
          setTranscriptionContent(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erro na transcrição:', event.error);
        if (event.error === 'no-speech') {
          // Reiniciar automaticamente se não houver fala
          if (recordingStatus === 'recording') {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.log('Reconhecimento já ativo');
              }
            }, 1000);
          }
        }
      };

      recognition.onend = () => {
        // Reiniciar automaticamente se ainda estiver gravando
        if (recordingStatus === 'recording') {
          try {
            recognition.start();
          } catch (e) {
            console.log('Reconhecimento já ativo');
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      showError('Navegador Incompatível', 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
    }
  };

  const startRecording = async () => {
    try {
      if (!selectedPatient || !selectedDevice) {
        showError('Campos Obrigatórios', 'Selecione um paciente e um microfone para iniciar a consulta.');
        return;
      }

      // Obter stream de áudio do dispositivo selecionado
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDevice }
      });

      streamRef.current = stream;

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Iniciar reconhecimento de voz
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Iniciar contagem de tempo
      const now = new Date();
      setStartTime(now);
      setDuration(0);
      
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      setRecordingStatus('recording');
      showSuccess('Consulta Iniciada', 'A transcrição em tempo real foi iniciada.');

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      showError('Erro na Gravação', 'Não foi possível iniciar a gravação. Verifique as permissões do microfone.');
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setRecordingStatus('paused');
    showSuccess('Consulta Pausada', 'A transcrição foi pausada.');
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }

    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    setRecordingStatus('recording');
    showSuccess('Consulta Retomada', 'A transcrição foi retomada.');
  };

  const stopRecording = async () => {
    setSaving(true);
    
    try {
      // Parar reconhecimento de voz
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Parar contagem de tempo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Parar stream de áudio
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const endTime = new Date();
      const durationFormatted = formatDuration(duration);

      // Salvar sessão no Supabase
      const { error } = await supabase
        .from('sessions')
        .insert({
          patient_id: selectedPatient,
          user_id: currentUser.id,
          title: sessionTitle.trim(),
          transcription_content: transcriptionContent.trim() || null,
          start_time: startTime?.toISOString(),
          end_time: endTime.toISOString(),
          duration: durationFormatted,
          status: 'completed'
        });

      if (error) throw error;
      
      setRecordingStatus('completed');
      showSuccess('Consulta Salva', 'A consulta foi salva com sucesso!');
      
      // Voltar para a lista de sessões após 2 segundos
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      showError('Erro ao Salvar', 'Não foi possível salvar a consulta. Tente novamente.');
      setRecordingStatus('recording'); // Voltar ao estado anterior
    } finally {
      setSaving(false);
    }
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canStartRecording = selectedPatient && selectedDevice && sessionTitle.trim() && recordingStatus === 'idle';
  const isRecording = recordingStatus === 'recording';
  const isPaused = recordingStatus === 'paused';
  const isCompleted = recordingStatus === 'completed';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Carregando...</h2>
          <p className="text-gray-600 text-sm">Preparando a página de consulta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Configuration */}
      {!isRecording && !isPaused && !isCompleted && (
        <div className="glass-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar às sessões</span>
            </button>
          </div>
          
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuração da Consulta</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paciente *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Microphone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Microfone *
              </label>
              <div className="relative">
                <Mic className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Selecione um microfone</option>
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Session Title */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Consulta
            </label>
            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-800 font-medium">
                {sessionTitle || 'Selecione um paciente para gerar o título automaticamente'}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Título gerado automaticamente com nome do paciente e data/hora
            </p>
          </div>

          {/* Start Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={startRecording}
              disabled={!canStartRecording}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Iniciar Consulta</span>
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      {(isRecording || isPaused) && (
        <div className="glass-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              disabled={true}
              className="flex items-center space-x-2 text-gray-400 cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar às sessões</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="text-lg font-mono font-bold text-gray-800">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${isRecording ? 'bg-red-100' : 'bg-yellow-100'}`}>
                {isRecording ? (
                  <Mic className="h-6 w-6 text-red-600" />
                ) : (
                  <MicOff className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {isRecording ? 'Gravando...' : 'Pausado'}
                </h3>
                <p className="text-sm text-gray-600">
                  {patients.find(p => p.id === selectedPatient)?.name} • {sessionTitle}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {isRecording ? (
                <button
                  onClick={pauseRecording}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Pause className="h-4 w-4" />
                  <span>Pausar</span>
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>Continuar</span>
                </button>
              )}
              
              <button
                onClick={stopRecording}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>{saving ? 'Salvando...' : 'Finalizar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Area */}
      {(isRecording || isPaused || isCompleted) && (
        <div className="glass-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Transcrição em Tempo Real</h3>
            {transcriptionContent && (
              <span className="text-sm text-gray-500">
                {transcriptionContent.length} caracteres
              </span>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
            {transcriptionContent ? (
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {transcriptionContent}
                {isRecording && <span className="animate-pulse">|</span>}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Mic className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">Aguardando transcrição...</p>
                <p className="text-sm">Comece a falar para ver a transcrição aparecer aqui</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="glass-card rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center space-x-3 text-purple-600">
            <Save className="h-6 w-6" />
            <span className="text-lg font-semibold">Consulta salva com sucesso!</span>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Redirecionando para a lista de sessões...
          </p>
        </div>
      )}
    </div>
  );
}