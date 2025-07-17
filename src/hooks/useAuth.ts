import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Função para limpar todas as sessões
  const clearAllSessions = useCallback(async () => {
    try {
      console.log('🧹 [clearAllSessions] Limpando todas as sessões...');
      
      // Limpar localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      // Limpar sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });

      // SignOut do Supabase
      await supabase.auth.signOut();
      
      console.log('✅ [clearAllSessions] Sessões limpas com sucesso');
    } catch (error) {
      console.error('❌ [clearAllSessions] Erro ao limpar sessões:', error);
    }
  }, []);

  // Função para processar o usuário autenticado
  const processAuthUser = useCallback(async (authUser: any): Promise<AuthUser | null> => {
    try {
      console.log('🔄 [processAuthUser] Processando usuário:', authUser.id);
      
      // Tentar buscar perfil existente
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.log('⚠️ [processAuthUser] Erro ao buscar perfil:', error.message);
        
        // Se usuário não existe, tentar criar
        if (error.code === 'PGRST116') {
          console.log('🆕 [processAuthUser] Criando novo perfil...');
          
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

          if (insertError) {
            console.error('❌ [processAuthUser] Erro ao criar perfil:', insertError);
            return null;
          }

          return {
            id: authUser.id,
            email: authUser.email,
            profile: newProfile as UserProfile
          };
        }
        
        return null;
      }

      console.log('✅ [processAuthUser] Perfil encontrado');
      return {
        id: authUser.id,
        email: authUser.email,
        profile: profile as UserProfile
      };
    } catch (error) {
      console.error('❌ [processAuthUser] Erro:', error);
      return null;
    }
  }, []);

  // Inicialização da autenticação
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 [initializeAuth] Iniciando verificação de autenticação...');
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.error('❌ [initializeAuth] Erro na sessão:', sessionError);
          await clearAllSessions();
          setUser(null);
          setError(null);
          setLoading(false);
          setIsInitialized(true);
          return;
        }

        if (session?.user) {
          console.log('👤 [initializeAuth] Usuário encontrado na sessão');
          const processedUser = await processAuthUser(session.user);
          
          if (!mounted) return;
          
          if (processedUser) {
            setUser(processedUser);
            setError(null);
          } else {
            console.log('⚠️ [initializeAuth] Falha ao processar usuário, fazendo logout...');
            await clearAllSessions();
            setUser(null);
            setError(null);
          }
        } else {
          console.log('❌ [initializeAuth] Nenhuma sessão encontrada');
          setUser(null);
          setError(null);
        }
        
        setLoading(false);
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ [initializeAuth] Erro geral:', error);
        if (mounted) {
          await clearAllSessions();
          setUser(null);
          setError(null);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Só inicializar se ainda não foi inicializado
    if (!isInitialized) {
      initializeAuth();
    }

    return () => {
      mounted = false;
    };
  }, [isInitialized, clearAllSessions, processAuthUser]);

  // Listener para mudanças de autenticação
  useEffect(() => {
    if (!isInitialized) return;

    console.log('👂 [useAuth] Configurando listener de mudanças de auth...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [onAuthStateChange] Evento:', event);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 [onAuthStateChange] Usuário deslogado');
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 [onAuthStateChange] Usuário logado');
        setLoading(true);
        
        const processedUser = await processAuthUser(session.user);
        
        if (processedUser) {
          setUser(processedUser);
          setError(null);
        } else {
          console.log('⚠️ [onAuthStateChange] Falha ao processar usuário no login');
          await clearAllSessions();
          setUser(null);
          setError(null);
        }
        
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, clearAllSessions, processAuthUser]);

  // Função de logout
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [signOut] Iniciando logout...');
      setLoading(true);
      await clearAllSessions();
      setUser(null);
      setError(null);
      setLoading(false);
      console.log('✅ [signOut] Logout concluído');
    } catch (error) {
      console.error('❌ [signOut] Erro no logout:', error);
      // Forçar limpeza mesmo com erro
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, [clearAllSessions]);

  // Função para verificar se é admin
  const isAdmin = useCallback(() => {
    return user?.profile?.role === 'admin';
  }, [user]);

  // Função para atualizar perfil
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 [refreshProfile] Atualizando perfil...');
      
      // Verificar sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('⚠️ [refreshProfile] Sessão inválida, fazendo logout...');
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
        setUser({
          id: user.id,
          email: user.email,
          profile: profile as UserProfile
        });
        console.log('✅ [refreshProfile] Perfil atualizado');
      }
    } catch (error) {
      console.error('❌ [refreshProfile] Erro:', error);
    }
  }, [user, clearAllSessions]);

  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile
  };
}