import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  console.log('🔍 [useAuth] Hook inicializado');

  // Função para limpar todas as sessões - movida para escopo principal
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
    let mounted = true;

    console.log('🔍 [useAuth] useEffect iniciado');

    const initializeAuth = async () => {
      if (isProcessingRef.current) {
        console.log('⚠️ [initializeAuth] Já está processando, ignorando...');
        return;
      }

      isProcessingRef.current = true;

      try {
        setLoading(true);
        console.log('🔍 [initializeAuth] Inicializando autenticação...');
        console.log('🔍 [initializeAuth] mounted:', mounted, 'isProcessing:', isProcessingRef.current);
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔍 [initializeAuth] Sessão obtida:', {
          session: session ? 'EXISTS' : 'NULL',
          user: session?.user ? session.user.id : 'NO_USER',
          sessionError: sessionError?.message || 'NO_ERROR'
        });
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('❌ [initializeAuth] Erro ao buscar sessão:', sessionError);
          await clearAllSessions();
          if (mounted) {
            setUser(null);
            setError(null);
          }
          return;
        }
        
        if (session?.user) {
          console.log('✅ [initializeAuth] Sessão encontrada, verificando usuário...');
          console.log('🔍 [initializeAuth] User data:', session.user.id, session.user.email);
          await handleUserSession(session.user);
        } else {
          console.log('👤 [initializeAuth] Nenhuma sessão ativa');
          if (mounted) {
            setUser(null);
            setError(null);
          }
        }
      } catch (error) {
        console.error('❌ [initializeAuth] Erro na inicialização:', error);
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        isProcessingRef.current = false;
      }
    };

    const handleUserSession = async (authUser: any) => {
      if (!mounted) return;

      try {
        console.log('👤 [handleUserSession] Buscando perfil do usuário:', authUser.id);
        console.log('🔍 [handleUserSession] Auth user data:', {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at
        });
        
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

        if (!mounted) return;

        if (error) {
          console.error('❌ [handleUserSession] Erro ao buscar perfil:', error.message);
          
          // Se usuário não existe no banco, limpar tudo e fazer logout
          if (error.code === 'PGRST116' || 
              error.message?.includes('No rows found') ||
              error.message?.includes('relation "profiles" does not exist')) {
            console.log('🚪 [handleUserSession] Usuário não encontrado no banco, limpando sessão...');
            await clearAllSessions();
            if (mounted) {
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

          console.log('🔍 [handleUserSession] Profile creation result:', {
            newProfile: newProfile ? 'CREATED' : 'FAILED',
            insertError: insertError?.message || 'NO_ERROR'
          });

          if (!mounted) return;

          if (insertError) {
            console.error('❌ [handleUserSession] Erro ao criar perfil:', insertError.message);
            
            // Qualquer erro na criação do perfil resulta em logout
            console.log('🚪 [handleUserSession] Falha ao criar perfil, limpando sessão...');
            await clearAllSessions();
            if (mounted) {
              setUser(null);
              setError(null);
            }
            return;
          }

          console.log('✅ [handleUserSession] Perfil criado com sucesso');
          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: newProfile as UserProfile
            });
          }
        } else {
          console.log('✅ [handleUserSession] Perfil encontrado');
          console.log('🔍 [handleUserSession] Profile data:', {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            full_name: profile.full_name
          });
          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: profile as UserProfile
            });
          }
        }
      } catch (error) {
        console.error('❌ [handleUserSession] Erro crítico ao buscar perfil:', error);
        console.log('🚪 [handleUserSession] Erro crítico, forçando logout...');
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
        }
      }
    };

    // Inicializar
    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessingRef.current) {
        console.log('⚠️ [onAuthStateChange] Ignorando evento - mounted:', mounted, 'isProcessing:', isProcessingRef.current);
        return;
      }
      
      isProcessingRef.current = true;
      
      try {
        console.log('🔄 [onAuthStateChange] Mudança de autenticação:', {
          event,
          session: session ? 'EXISTS' : 'NULL',
          user: session?.user ? session.user.id : 'NO_USER',
          mounted
        });
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🚪 [onAuthStateChange] Usuário deslogado');
          if (mounted) {
            setUser(null);
            setError(null);
            setLoading(false);
            console.log('✅ [onAuthStateChange] Estado do usuário limpo - deve mostrar tela de login');
          }
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 [onAuthStateChange] Usuário logado');
          await handleUserSession(session.user);
        }
      } catch (error) {
        console.error('❌ [onAuthStateChange] Erro no processamento do evento:', error);
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      } finally {
        isProcessingRef.current = false;
      }
    });

    return () => {
      mounted = false;
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
    
    if (!user && !loading) {
      console.log('🔓 [useAuth] Usuário deslogado - App deve mostrar tela de login');
    }
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
      console.log('🔍 [signOut] Estado atual do usuário:', user ? user.email : 'NULL');
      
      // Usar a função centralizada de limpeza
      await clearAllSessions();
      
      console.log('✅ [signOut] Logout realizado com sucesso');
      console.log('🔄 [signOut] Aguardando onAuthStateChange disparar...');
    } catch (error) {
      console.error('❌ [signOut] Erro ao fazer logout:', error);
      // Forçar limpeza do estado mesmo com erro
      await clearAllSessions();
      
      // Forçar atualização do estado se o onAuthStateChange não disparar
      console.log('🔧 [signOut] Forçando limpeza do estado devido ao erro...');
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const isAdmin = () => user?.profile?.role === 'admin';

  const refreshProfile = async () => {
    if (!user || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    try {
      console.log('🔄 [refreshProfile] Revalidando perfil do usuário:', user.id);
      
      // Verificar sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('❌ [refreshProfile] Sessão inválida, forçando logout');
        await clearAllSessions();
        setUser(null);
        setError(null);
        setLoading(false);
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

      if (profile) {
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
      isProcessingRef.current = false;
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