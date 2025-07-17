import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 🔍 INVESTIGAÇÃO: Verificar variáveis de ambiente
console.log('🔍 SUPABASE CONFIG CHECK:');
console.log('URL:', supabaseUrl ? '✅ Presente' : '❌ Ausente');
console.log('ANON_KEY:', supabaseAnonKey ? '✅ Presente' : '❌ Ausente');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente ausentes');
  throw new Error('Missing Supabase environment variables')
}
