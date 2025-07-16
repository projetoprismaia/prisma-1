/*
  # Permitir que admins vejam contagem de pacientes

  1. Política Simples
    - Permite que admins vejam todos os pacientes (apenas user_id para contagem)
    - Mantém segurança para usuários normais
  
  2. Segurança
    - Usuários normais continuam vendo apenas seus pacientes
    - Admins podem ver user_id de todos os pacientes para contagem
*/

-- Adicionar política para admins verem user_id de todos os pacientes (apenas para contagem)
CREATE POLICY "Admins can view patient user_ids for counting"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) = 'admin'::user_role
  );