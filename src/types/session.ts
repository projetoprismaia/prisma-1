export interface Session {
  id: string;
  patient_id: string;
  user_id: string;
  title: string;
  transcription_content: string | null;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
  status: 'recording' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  // Dados do paciente (via JOIN)
  patient?: {
    id: string;
    name: string;
    email?: string;
    whatsapp?: string;
  };
}

export interface SessionFormData {
  patient_id: string;
  title: string;
}