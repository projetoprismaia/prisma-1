import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const isMounted = useRef(true);

  // Função para limpar todas as sessões
  const clearAllSessions = useCallback(async () => {
    try {
      console.log('🧹 [clearAllSessions] Limpando todas as sessões...');
      
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });

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
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.log('⚠️ [processAuthUser] Erro ao buscar perfil:', error.message);
        
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

  // Função de logout
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [signOut] Iniciando logout...');
      setLoading(true);
      await clearAllSessions();
      if (isMounted.current) {
        setUser(null);
        setError(null);
        setLoading(false);
      }
      console.log('✅ [signOut] Logout concluído');
    } catch (error) {
      console.error('❌ [signOut] Erro no logout:', error);
      if (isMounted.current) {
        setUser(null);
        setError(null);
        setLoading(false);
      }
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
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('⚠️ [refreshProfile] Sessão inválida, fazendo logout...');
        await clearAllSessions();
        if (isMounted.current) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ [refreshProfile] Erro ao buscar perfil:', error);
        return;
      }

      if (profile && isMounted.current) {
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

  // Inicialização da autenticação - useEffect principal
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      if (isInitialized.current) return;
      
      try {
        console.log('🚀 [initializeAuth] Iniciando verificação de autenticação...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted.current) return;

        if (sessionError) {
          console.error('❌ [initializeAuth] Erro na sessão:', sessionError);
          await clearAllSessions();
          if (isMounted.current) {
            setUser(null);
            setError(null);
            setLoading(false);
          }
          isInitialized.current = true;
          return;
        }

        if (session?.user) {
          console.log('👤 [initializeAuth] Usuário encontrado na sessão');
          const processedUser = await processAuthUser(session.user);
          
          if (!isMounted.current) return;
          
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
          if (isMounted.current) {
            setUser(null);
            setError(null);
          }
        }
        
        if (isMounted.current) {
          setLoading(false);
        }
        isInitialized.current = true;
        
      } catch (error) {
        console.error('❌ [initializeAuth] Erro geral:', error);
        if (isMounted.current) {
          await clearAllSessions();
          setUser(null);
          setError(null);
          setLoading(false);
        }
        isInitialized.current = true;
      }
    };

    initializeAuth();

    return () => {
      isMounted.current = false;
    };
  }, [clearAllSessions, processAuthUser]);

  // Listener para mudanças de autenticação
  useEffect(() => {
    console.log('👂 [useAuth] Configurando listener de mudanças de auth...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current || !isInitialized.current) return;
      
      console.log('🔄 [onAuthStateChange] Evento:', event);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 [onAuthStateChange] Usuário deslogado');
        if (isMounted.current) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 [onAuthStateChange] Usuário logado');
        if (isMounted.current) {
          setLoading(true);
        }
        
        const processedUser = await processAuthUser(session.user);
        
        if (!isMounted.current) return;
        
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
  }, [clearAllSessions, processAuthUser]);

  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile
  };
}