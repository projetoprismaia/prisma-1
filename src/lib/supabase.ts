import { createClient } from '@supabase/supabase-js'
import { AuthError, NetworkError, TimeoutError, SupabaseError, classifySupabaseError } from '../utils/errors';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Função robusta para executar requisições ao Supabase com retry, timeout e verificação de sessão
 * @param queryPromise - Promise da query do Supabase
 * @param options - Opções de configuração
 * @returns Dados da query ou lança erro classificado
 */
export async function fetchDataWithRetry<T>(
  queryPromise: () => Promise<{ data: T | null; error: any }>,
  options: {
    maxRetries?: number;
    timeout?: number;
    signal?: AbortSignal;
    skipSessionCheck?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    timeout = 15000, // 15 segundos
    signal,
    skipSessionCheck = false
  } = options;

  console.log('🚀 [fetchDataWithRetry] Iniciando requisição com retry', {
    maxRetries,
    timeout,
    hasSignal: !!signal,
    skipSessionCheck
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [fetchDataWithRetry] Tentativa ${attempt}/${maxRetries}`);

      // Verificar se a requisição foi cancelada
      if (signal?.aborted) {
        console.log('❌ [fetchDataWithRetry] Requisição cancelada pelo AbortSignal');
        throw new Error('Requisição cancelada');
      }

      // Verificar sessão ativa antes da requisição (exceto se skipSessionCheck for true)
      if (!skipSessionCheck) {
        console.log('🔐 [fetchDataWithRetry] Verificando sessão ativa...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [fetchDataWithRetry] Erro ao verificar sessão:', sessionError);
          throw new AuthError('Sessão inválida');
        }
        
        if (!session) {
          console.error('❌ [fetchDataWithRetry] Nenhuma sessão ativa encontrada');
          throw new AuthError('Usuário não autenticado');
        }
        
        console.log('✅ [fetchDataWithRetry] Sessão válida confirmada');
      }

      // Executar a query com timeout
      const result = await Promise.race([
        queryPromise(),
        new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            console.error(`⏱️ [fetchDataWithRetry] Timeout após ${timeout}ms na tentativa ${attempt}`);
            reject(new TimeoutError(`Requisição expirou após ${timeout}ms`));
          }, timeout);

          // Limpar timeout se a requisição for cancelada
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Requisição cancelada'));
          });
        })
      ]);

      // Verificar erro na resposta
      if (result.error) {
        console.error(`❌ [fetchDataWithRetry] Erro na tentativa ${attempt}:`, result.error);
        throw classifySupabaseError(result.error);
      }

      // Sucesso
      console.log(`✅ [fetchDataWithRetry] Sucesso na tentativa ${attempt}`);
      return result.data as T;

    } catch (error) {
      console.error(`❌ [fetchDataWithRetry] Falha na tentativa ${attempt}:`, error);

      // Se for erro de autenticação, não tentar novamente
      if (error instanceof AuthError) {
        console.error('🔐 [fetchDataWithRetry] Erro de autenticação - não tentando novamente');
        throw error;
      }

      // Se for a última tentativa, lançar o erro
      if (attempt === maxRetries) {
        console.error('❌ [fetchDataWithRetry] Todas as tentativas falharam');
        throw error instanceof Error ? error : classifySupabaseError(error);
      }

      // Calcular delay progressivo para próxima tentativa
      const delay = attempt * 1000; // 1s, 2s, 3s
      console.log(`⏳ [fetchDataWithRetry] Aguardando ${delay}ms antes da próxima tentativa...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Este ponto nunca deve ser alcançado, mas TypeScript exige
  throw new SupabaseError('Erro inesperado no fetchDataWithRetry');
}

/**
 * Função para testar conectividade com o Supabase (heartbeat)
 * @returns Promise que resolve com true se conectado, false caso contrário
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('💓 [testSupabaseConnection] Testando conexão com Supabase...');
    
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [testSupabaseConnection] Erro na conexão:', error);
      return false;
    }
    
    console.log('✅ [testSupabaseConnection] Conexão OK');
    return true;
  } catch (error) {
    console.error('❌ [testSupabaseConnection] Falha na conexão:', error);
    return false;
  }
}