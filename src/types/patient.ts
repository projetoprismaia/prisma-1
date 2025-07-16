export interface Patient {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PatientFormData {
  name: string;
  email: string;
  whatsapp: string;
}