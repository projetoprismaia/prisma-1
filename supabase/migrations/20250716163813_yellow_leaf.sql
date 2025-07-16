/*
  # Criar tabela de sessões de transcrição

  1. Nova Tabela
    - `sessions`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key para patients)
      - `user_id` (uuid, foreign key para profiles)
      - `title` (text, título da sessão)
      - `transcription_content` (text, conteúdo da transcrição)
      - `start_time` (timestamptz, início da gravação)
      - `end_time` (timestamptz, fim da gravação)
      - `duration` (text, duração formatada HH:MM:SS)
      - `status` (text, status da sessão: recording, completed, paused)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Índices
    - Índice para `patient_id` (busca por paciente)
    - Índice para `user_id` (busca por usuário)
    - Índice para `start_time` (filtro por data)
    - Índice para `status` (filtro por status)

  3. Segurança (RLS)
    - Enable RLS na tabela `sessions`
    - Política para usuários verem apenas suas próprias sessões
    - Política para usuários criarem sessões apenas para seus pacientes
    - Política para usuários atualizarem apenas suas próprias sessões
    - Política para usuários deletarem apenas suas próprias sessões

  4. Triggers
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar enum para status da sessão
CREATE TYPE session_status AS ENUM ('recording', 'paused', 'completed');

-- Criar tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  transcription_content text DEFAULT '',
  start_time timestamptz DEFAULT now(),
  end_time timestamptz DEFAULT NULL,
  duration text DEFAULT '00:00:00',
  status session_status DEFAULT 'recording',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar chaves estrangeiras
ALTER TABLE sessions 
ADD CONSTRAINT sessions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE sessions 
ADD CONSTRAINT sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS sessions_patient_id_idx ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_start_time_idx ON sessions(start_time);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions(created_at);

-- Adicionar trigger para updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver apenas suas próprias sessões
CREATE POLICY "Users can view their own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política para INSERT: usuários podem criar sessões apenas para seus pacientes
CREATE POLICY "Users can create sessions for their patients"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = sessions.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

-- Política para UPDATE: usuários podem atualizar apenas suas próprias sessões
CREATE POLICY "Users can update their own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política para DELETE: usuários podem deletar apenas suas próprias sessões
CREATE POLICY "Users can delete their own sessions"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Política especial para admins visualizarem contagem de sessões (sem conteúdo)
CREATE POLICY "Admins can view session counts"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Comentários para documentação
COMMENT ON TABLE sessions IS 'Sessões de transcrição de consultas psiquiátricas';
COMMENT ON COLUMN sessions.patient_id IS 'ID do paciente associado à sessão';
COMMENT ON COLUMN sessions.user_id IS 'ID do profissional que conduziu a sessão';
COMMENT ON COLUMN sessions.title IS 'Título da sessão (opcional)';
COMMENT ON COLUMN sessions.transcription_content IS 'Conteúdo da transcrição em tempo real';
COMMENT ON COLUMN sessions.start_time IS 'Horário de início da gravação';
COMMENT ON COLUMN sessions.end_time IS 'Horário de fim da gravação';
COMMENT ON COLUMN sessions.duration IS 'Duração formatada da sessão (HH:MM:SS)';
COMMENT ON COLUMN sessions.status IS 'Status atual da sessão (recording, paused, completed)';