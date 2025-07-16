import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Debug Supabase Config:', {
  url: supabaseUrl ? 'Configurado' : 'AUSENTE',
  key: supabaseAnonKey ? 'Configurado' : 'AUSENTE',
  env: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);
  throw new Error('Missing Supabase environment variables')
}
