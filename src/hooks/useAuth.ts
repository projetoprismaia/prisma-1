import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(true);

  console.log('🔍 [useAuth] Hook inicializado');

  // Função para limpar todas as sessões
  const clearAllSessions = async () => {
    try {
      console.log('🧹 [clearAllSessions] Limpando todas as sessões...');
      
      // Limpar localStorage do Supabase
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
          console.log('🗑️ [clearAllSessions] Removido do localStorage:', key);
        }
      });

      // Limpar sessionStorage do Supabase
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
          console.log('🗑️ [clearAllSessions] Removido do sessionStorage:', key);
        }
      });

      // Forçar logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('⚠️ [clearAllSessions] Erro no signOut do Supabase:', error);
      } else {
        console.log('✅ [clearAllSessions] SignOut do Supabase executado com sucesso');
      }
      
      console.log('✅ [clearAllSessions] Todas as sessões foram limpas');
    } catch (error) {
      console.error('❌ [clearAllSessions] Erro ao limpar sessões:', error);
    }
  };

  useEffect(() => {
    console.log('🔍 [useAuth] useEffect iniciado');

    const initializeAuth = async () => {
      // Verificar se já está processando ou se o componente foi desmontado
      if (isProcessingRef.current || !mountedRef.current) {
        console.log('⚠️ [initializeAuth] Já está processando ou desmontado, ignorando...');
        return;
      }

      isProcessingRef.current = true;

      try {
        setLoading(true);
        console.log('🔍 [initializeAuth] Inicializando autenticação...');
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔍 [initializeAuth] Sessão obtida:', {
          session: session ? 'EXISTS' : 'NULL',
          user: session?.user ? session.user.id : 'NO_USER',
          sessionError: sessionError?.message || 'NO_ERROR'
        });
        
        if (!mountedRef.current) return;
        
        if (sessionError) {
          console.error('❌ [initializeAuth] Erro ao buscar sessão:', sessionError);
          await clearAllSessions();
          if (mountedRef.current) {
            setUser(null);
            setError(null);
          }
          return;
        }
        
        if (session?.user) {
          console.log('✅ [initializeAuth] Sessão encontrada, verificando usuário...');
          await handleUserSession(session.user);
        } else {
          console.log('👤 [initializeAuth] Nenhuma sessão ativa');
          if (mountedRef.current) {
            setUser(null);
            setError(null);
          }
        }
      } catch (error) {
        console.error('❌ [initializeAuth] Erro na inicialização:', error);
        await clearAllSessions();
        if (mountedRef.current) {
          setUser(null);
          setError(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        isProcessingRef.current = false;
      }
    };

    const handleUserSession = async (authUser: any) => {
      if (!mountedRef.current) return;

      try {
        console.log('👤 [handleUserSession] Buscando perfil do usuário:', authUser.id);
        
        // Tentar buscar perfil existente
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        console.log('🔍 [handleUserSession] Profile query result:', {
          profile: profile ? 'FOUND' : 'NOT_FOUND',
          error: error?.message || 'NO_ERROR'
        });

        if (!mountedRef.current) return;

        if (error) {
          console.error('❌ [handleUserSession] Erro ao buscar perfil:', error.message);
          
          // Se usuário não existe no banco, limpar tudo e fazer logout
          if (error.code === 'PGRST116' || 
              error.message?.includes('No rows found') ||
              error.message?.includes('relation "profiles" does not exist')) {
            console.log('🚪 [handleUserSession] Usuário não encontrado no banco, limpando sessão...');
            await clearAllSessions();
            if (mountedRef.current) {
              setUser(null);
              setError(null);
            }
            return;
          }

          // Para outros erros, tentar criar perfil
          console.log('📝 [handleUserSession] Tentando criar perfil...');
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              role: 'user',
              full_name: authUser.user_metadata?.full_name || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!mountedRef.current) return;

          if (insertError) {
            console.error('❌ [handleUserSession] Erro ao criar perfil:', insertError.message);
            await clearAllSessions();
            if (mountedRef.current) {
              setUser(null);
              setError(null);
            }
            return;
          }

          console.log('✅ [handleUserSession] Perfil criado com sucesso');
          if (mountedRef.current) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: newProfile as UserProfile
            });
          }
        } else {
          console.log('✅ [handleUserSession] Perfil encontrado');
          if (mountedRef.current) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: profile as UserProfile
            });
          }
        }
      } catch (error) {
        console.error('❌ [handleUserSession] Erro crítico ao buscar perfil:', error);
        await clearAllSessions();
        if (mountedRef.current) {
          setUser(null);
          setError(null);
        }
      }
    };

    // Inicializar
    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [onAuthStateChange] Evento recebido:', {
        event,
        session: session ? 'EXISTS' : 'NULL',
        user: session?.user ? session.user.id : 'NO_USER',
        mounted: mountedRef.current,
        isProcessing: isProcessingRef.current
      });

      // Verificar se deve processar o evento
      if (!mountedRef.current) {
        console.log('⚠️ [onAuthStateChange] Componente desmontado, ignorando evento');
        return;
      }

      if (isProcessingRef.current) {
        console.log('⚠️ [onAuthStateChange] Já está processando, ignorando evento');
        return;
      }

      // Marcar como processando
      isProcessingRef.current = true;
      
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🚪 [onAuthStateChange] Usuário deslogado');
          if (mountedRef.current) {
            setUser(null);
            setError(null);
            setLoading(false);
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 [onAuthStateChange] Usuário logado');
          if (mountedRef.current) {
            setLoading(true);
          }
          await handleUserSession(session.user);
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ [onAuthStateChange] Erro no processamento do evento:', error);
        if (mountedRef.current) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      } finally {
        // Sempre resetar o flag de processamento
        isProcessingRef.current = false;
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Log adicional para monitorar mudanças no estado do usuário
  useEffect(() => {
    console.log('👤 [useAuth] Estado do usuário mudou:', {
      user: user ? `${user.email} (${user.id})` : 'NULL',
      loading,
      shouldShowLogin: !user && !loading
    });
  }, [user, loading]);

  const signOut = async () => {
    if (isProcessingRef.current) {
      console.log('⚠️ [signOut] Já está processando, ignorando...');
      return;
    }

    isProcessingRef.current = true;
    
    try {
      setLoading(true);
      console.log('🔓 [signOut] Fazendo logout...');
      
      // Usar a função centralizada de limpeza
      await clearAllSessions();
      
      console.log('✅ [signOut] Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ [signOut] Erro ao fazer logout:', error);
      // Forçar limpeza do estado mesmo com erro
      await clearAllSessions();
      
      if (mountedRef.current) {
        setUser(null);
        setError(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isProcessingRef.current = false;
    }
  };

  const isAdmin = () => user?.profile?.role === 'admin';

  const refreshProfile = async () => {
    if (!user || isProcessingRef.current) return;
    
    const wasProcessing = isProcessingRef.current;
    isProcessingRef.current = true;
    
    try {
      console.log('🔄 [refreshProfile] Revalidando perfil do usuário:', user.id);
      
      // Verificar sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('❌ [refreshProfile] Sessão inválida, forçando logout');
        await clearAllSessions();
        if (mountedRef.current) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      
      // Buscar perfil atualizado
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ [refreshProfile] Erro ao buscar perfil:', error);
        return;
      }

      if (profile && mountedRef.current) {
        console.log('✅ [refreshProfile] Perfil atualizado com sucesso');
        setUser({
          id: user.id,
          email: user.email,
          profile: profile as UserProfile
        });
      }
    } catch (error) {
      console.error('❌ [refreshProfile] Erro ao revalidar perfil:', error);
    } finally {
      isProcessingRef.current = wasProcessing;
    }
  };

  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile
  };
}