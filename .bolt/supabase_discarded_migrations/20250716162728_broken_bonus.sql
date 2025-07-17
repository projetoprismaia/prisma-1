/*
  # Adicionar função para admins contarem pacientes

  1. Nova Função
    - `get_user_role()` - função para verificar role do usuário atual
    - `count_patients_by_user()` - função para admins contarem pacientes

  2. Políticas Atualizadas
    - Permitir que admins vejam contagem de pacientes (não o conteúdo)
    - Manter segurança para usuários normais
*/

-- Função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para admins contarem pacientes por usuário
CREATE OR REPLACE FUNCTION count_patients_by_user()
RETURNS TABLE(user_id uuid, patient_count bigint) AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Retornar contagem de pacientes por usuário
  RETURN QUERY
  SELECT 
    p.user_id,
    COUNT(*) as patient_count
  FROM patients p
  GROUP BY p.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para permitir que admins executem a função de contagem
CREATE POLICY "Admins can count patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');