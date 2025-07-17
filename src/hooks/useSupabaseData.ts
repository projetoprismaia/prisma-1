import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDataWithRetry } from '../lib/supabase';
import { cache, generateCacheKey } from '../utils/cache';
import { useNotification } from './useNotification';
import { AuthError } from '../utils/errors';

/**
 * Hook personalizado para buscar dados do Supabase com cache, retry e estados de loading/erro
 * @param queryFn - Função que retorna a promise da query do Supabase
 * @param cacheKey - Chave para cache dos dados
 * @param options - Opções de configuração
 */
export function useSupabaseData<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  options: {
    enabled?: boolean;
    skipCache?: boolean;
    skipSessionCheck?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    enabled = true,
    skipCache = false,
    skipSessionCheck = false,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showErrorFromException } = useNotification();
  
  // AbortController para cancelar requisições
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Função para buscar dados com cache e retry
   */
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!enabled) {
      console.log('🚫 [useSupabaseData] Fetch desabilitado para:', cacheKey);
      return;
    }

    console.log('🔍 [useSupabaseData] Iniciando fetch para:', cacheKey, { forceRefresh, skipCache });

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      console.log('❌ [useSupabaseData] Cancelando requisição anterior');
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      setError(null);

      // Verificar cache primeiro (se não for refresh forçado)
      if (!forceRefresh && !skipCache) {
        const cachedData = cache.get<T>(cacheKey);
        if (cachedData) {
          console.log('📦 [useSupabaseData] Dados encontrados no cache:', cacheKey);
          setData(cachedData);
          setLoading(false);
          
          // Buscar dados atualizados em background
          console.log('🔄 [useSupabaseData] Buscando dados atualizados em background...');
          fetchDataFromServer(signal, true);
          return;
        }
      }

      // Buscar dados do servidor
      await fetchDataFromServer(signal, false);

    } catch (err) {
      handleFetchError(err as Error);
    }
  }, [enabled, cacheKey, skipCache, skipSessionCheck, queryFn, onSuccess, onError]);

  /**
   * Função interna para buscar dados do servidor
   */
  const fetchDataFromServer = async (signal: AbortSignal, isBackground: boolean) => {
    try {
      console.log('🌐 [useSupabaseData] Buscando dados do servidor:', cacheKey);

      const result = await fetchDataWithRetry(
        queryFn,
        {
          signal,
          skipSessionCheck
        }
      );

      // Verificar se a requisição foi cancelada
      if (signal.aborted) {
        console.log('❌ [useSupabaseData] Requisição cancelada');
        return;
      }

      console.log('✅ [useSupabaseData] Dados recebidos com sucesso:', cacheKey);

      // Atualizar estado
      setData(result);
      setError(null);

      // Salvar no cache
      if (!skipCache) {
        cache.set(cacheKey, result);
      }

      // Callback de sucesso
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (err) {
      if (!isBackground) {
        throw err; // Re-lançar erro se não for busca em background
      } else {
        console.log('⚠️ [useSupabaseData] Erro na busca em background (ignorado):', err);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  /**
   * Função para tratar erros de fetch
   */
  const handleFetchError = (err: Error) => {
    console.error('❌ [useSupabaseData] Erro no fetch:', err);

    setError(err);
    setLoading(false);

    // Mostrar notificação de erro
    showErrorFromException(err, 'Erro ao Carregar Dados');

    // Callback de erro
    if (onError) {
      onError(err);
    }

    // Se for erro de autenticação, limpar dados e cache
    if (err instanceof AuthError) {
      console.log('🔐 [useSupabaseData] Erro de autenticação - limpando dados');
      setData(null);
      cache.invalidate(cacheKey);
    }
  };

  /**
   * Função para tentar novamente
   */
  const retry = useCallback(() => {
    console.log('🔄 [useSupabaseData] Tentando novamente:', cacheKey);
    fetchData(true); // Forçar refresh
  }, [fetchData, cacheKey]);

  /**
   * Função para invalidar cache e recarregar
   */
  const refresh = useCallback(() => {
    console.log('🔄 [useSupabaseData] Atualizando dados:', cacheKey);
    cache.invalidate(cacheKey);
    fetchData(true);
  }, [fetchData, cacheKey]);

  // Efeito para buscar dados quando o hook é montado ou dependências mudam
  useEffect(() => {
    fetchData();

    // Cleanup: cancelar requisições pendentes
    return () => {
      if (abortControllerRef.current) {
        console.log('🧹 [useSupabaseData] Limpando requisições pendentes:', cacheKey);
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    retry,
    refresh,
    isFromCache: !loading && !!data && cache.has(cacheKey)
  };
}

/**
 * Hook específico para dados de usuários (admin)
 */
export function useUsers(currentUserId: string) {
  const cacheKey = generateCacheKey(currentUserId, 'users');
  
  return useSupabaseData(
    () => import('../lib/supabase').then(({ supabase }) => 
      supabase.from('profiles').select('*').order('created_at', { ascending: false })
    ),
    cacheKey
  );
}

/**
 * Hook específico para dados de pacientes
 */
export function usePatients(currentUserId: string) {
  const cacheKey = generateCacheKey(currentUserId, 'patients');
  
  return useSupabaseData(
    () => import('../lib/supabase').then(({ supabase }) => 
      supabase.from('patients').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false })
    ),
    cacheKey
  );
}

/**
 * Hook específico para dados de sessões
 */
export function useSessions(currentUserId: string, patientFilter?: string) {
  const cacheKey = generateCacheKey(currentUserId, 'sessions', patientFilter ? { patientFilter } : undefined);
  
  return useSupabaseData(
    () => import('../lib/supabase').then(({ supabase }) => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (patientFilter) {
        query = query.eq('patient_id', patientFilter);
      }
      
      return query;
    }),
    cacheKey
  );
}

/**
 * Hook específico para dados de uma sessão específica
 */
export function useSession(sessionId: string, currentUserId: string) {
  const cacheKey = generateCacheKey(currentUserId, 'session', { sessionId });
  
  return useSupabaseData(
    () => import('../lib/supabase').then(({ supabase }) => 
      supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name, email, whatsapp)
        `)
        .eq('id', sessionId)
        .eq('user_id', currentUserId)
        .single()
    ),
    cacheKey
  );
}