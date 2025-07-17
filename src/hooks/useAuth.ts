import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para limpar todas as sessões - movida para escopo principal
  const clearAllSessions = async () => {
    try {
      console.log('🧹 [clearAllSessions] Limpando todas as sessões...');
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
          console.log('🗑️ [clearAllSessions] Removido do localStorage:', key);
        }
      });

      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
          console.log('🗑️ [clearAllSessions] Removido do sessionStorage:', key);
        }
      });

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('⚠️ [clearAllSessions] Erro no signOut do Supabase:', error);
      }
    } catch (error) {
      console.error('❌ [clearAllSessions] Erro ao limpar sessões:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let isProcessing = false;

    const initializeAuth = async () => {
      if (isProcessing || !mounted) return;
      isProcessing = true;
      try {
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          await clearAllSessions();
          if (mounted) {
            setUser(null);
            setError(null);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
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
        // Tentar buscar perfil existente
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!mounted) return;

        if (error) {
          // Se usuário não existe no banco, limpar tudo e fazer logout
          if (error.code === 'PGRST116' || 
              error.message?.includes('No rows found') ||
              error.message?.includes('relation "profiles" does not exist')) {
            await clearAllSessions();
            if (mounted) {
              setUser(null);
              setError(null);
              setLoading(false);
            }
            return;
          }

          // Para outros erros, tentar criar perfil
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

          if (!mounted) return;

          if (insertError) {
            // Qualquer erro na criação do perfil resulta em logout
            await clearAllSessions();
            if (mounted) {
              setUser(null);
              setError(null);
              setLoading(false);
            }
            return;
          }

          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: newProfile as UserProfile
            });
            setLoading(false);
          }
        } else {
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
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
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
  }, [user, loading]);
  const signOut = async () => {
    try {
      // Usar a função centralizada de limpeza
      await clearAllSessions();
    } catch (error) {
      // Forçar limpeza do estado mesmo com erro
      await clearAllSessions();
      // Forçar atualização do estado se o onAuthStateChange não disparar
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };
  const isAdmin = () => user?.profile?.role === 'admin';
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // Verificar sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
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
        return;
      }

      if (profile) {
        setUser({
          id: user.id,
          email: user.email,
          profile: profile as UserProfile
        });
      }
    } catch (error) {
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