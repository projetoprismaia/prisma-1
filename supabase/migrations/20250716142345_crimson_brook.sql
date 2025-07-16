/*
  # Criar tabela de pacientes

  1. Nova Tabela
    - `patients`
      - `id` (uuid, primary key)
      - `name` (text, obrigatório)
      - `email` (text, opcional)
      - `whatsapp` (text, opcional)
      - `user_id` (uuid, foreign key para profiles.id)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `patients`
    - Políticas para usuários verem apenas seus próprios pacientes
    - Políticas para CRUD apenas dos próprios pacientes
*/

-- Criar tabela de pacientes
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  whatsapp text,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios pacientes
CREATE POLICY "Users can view their own patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política para usuários criarem pacientes para si mesmos
CREATE POLICY "Users can create their own patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Política para usuários editarem apenas seus próprios pacientes
CREATE POLICY "Users can update their own patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Política para usuários deletarem apenas seus próprios pacientes
CREATE POLICY "Users can delete their own patients"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS patients_user_id_idx ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS patients_name_idx ON public.patients(name);
CREATE INDEX IF NOT EXISTS patients_email_idx ON public.patients(email);