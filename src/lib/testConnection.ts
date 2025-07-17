// 🔍 TESTE DE CONEXÃO SUPABASE
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('🔍 TESTING SUPABASE CONNECTION...');
  
  try {
    // Teste 1: Verificar se o cliente foi criado
    console.log('🔍 TEST 1: Client created =', !!supabase);
    
    // Teste 2: Testar query simples
    console.log('🔍 TEST 2: Testing simple query...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    console.log('🔍 TEST 2 RESULT:', {
      hasData: !!data,
      error: error?.message
    });
    
    // Teste 3: Verificar autenticação atual
    console.log('🔍 TEST 3: Testing auth session...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔍 TEST 3 RESULT:', {
      hasSession: !!session,
      hasUser: !!session?.session?.user,
      error: sessionError?.message
    });
    
    // Teste 4: Verificar configuração
    console.log('🔍 TEST 4: Configuration check...');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Anon Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    return {
      success: true,
      message: 'Connection test completed'
    };
    
  } catch (error) {
    console.error('❌ CONNECTION TEST FAILED:', error);
    return {
      success: false,
      error: error
    };
  }
}