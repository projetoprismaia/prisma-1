import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    let isProcessing = false;

    console.log('🔍 [useAuth] useEffect iniciado');

    const initializeAuth = async () => {
      if (isProcessing || !mounted) return;
      isProcessing = true;

      try {
        console.log('🔍 [initializeAuth] Inicializando autenticação...');
        console.log('🔍 [initializeAuth] mounted:', mounted, 'isProcessing:', isProcessing);
        
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
            setLoading(false);
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
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ [initializeAuth] Erro na inicialização:', error);
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      } finally {
        isProcessing = false;
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
              setLoading(false);
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
            
            // Se erro de recursão ou política, limpar sessão
            if (insertError.message?.includes('infinite recursion') || 
                insertError.message?.includes('policy') ||
                insertError.message?.includes('relation "profiles" does not exist')) {
              console.log('🚪 [handleUserSession] Erro crítico, limpando sessão...');
              await clearAllSessions();
              if (mounted) {
                setUser(null);
                setError(null);
                setLoading(false);
              }
              return;
            }
            
            // Usar perfil temporário como último recurso
            console.log('⚠️ [handleUserSession] Usando perfil temporário...');
            if (mounted) {
              setUser({
                id: authUser.id,
                email: authUser.email,
                profile: {
                  id: authUser.id,
                  email: authUser.email,
                  role: 'user',
                  full_name: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              });
              setLoading(false);
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
            setLoading(false);
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
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ [handleUserSession] Erro crítico ao buscar perfil:', error);
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      }
    };

    // Inicializar
    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessing) return;
      
      console.log('🔄 [onAuthStateChange] Mudança de autenticação:', {
        event,
        session: session ? 'EXISTS' : 'NULL',
        user: session?.user ? session.user.id : 'NO_USER',
        mounted,
        isProcessing
      });
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 [onAuthStateChange] Usuário deslogado');
        console.log('🔄 [onAuthStateChange] Definindo user como null...');
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
    try {
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
      setLoading(false);
    }
  };

  const isAdmin = () => user?.profile?.role === 'admin';

  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile: () => user && handleUserSession({ id: user.id, email: user.email })
  };
}