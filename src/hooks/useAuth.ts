import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para limpar todas as sessões
  const clearAllSessions = useCallback(async () => {
    try {
      console.log('🧹 Limpando sessões...');
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });

      await supabase.auth.signOut();
      console.log('✅ Sessões limpas');
    } catch (error) {
      console.error('❌ Erro ao limpar sessões:', error);
    }
  }, []);

  // Função para processar usuário (SIMPLIFICADA PARA TESTE)
  const processAuthUser = useCallback(async (authUser: any): Promise<AuthUser | null> => {
    try {
      console.log('🔄 Processando usuário:', authUser.email);
      
      // TESTE: Pular verificação do banco temporariamente
      console.log('⚠️ MODO TESTE: Pulando verificação do banco profiles');
      
      // Retornar usuário básico sem consultar banco
      return {
        id: authUser.id,
        email: authUser.email,
        profile: {
          id: authUser.id,
          email: authUser.email,
          role: 'user', // Assumir como user por padrão
          full_name: authUser.user_metadata?.full_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as UserProfile
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar usuário:', error);
      return null;
    }
  }, []);

  // Função de logout
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Fazendo logout...');
      setLoading(true);
      await clearAllSessions();
      setUser(null);
      setError(null);
      setLoading(false);
      console.log('✅ Logout concluído');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, [clearAllSessions]);

  // Função para verificar se é admin
  const isAdmin = useCallback(() => {
    return user?.profile?.role === 'admin';
  }, [user]);

  // Função para atualizar perfil (SIMPLIFICADA)
  const refreshProfile = useCallback(async () => {
    console.log('🔄 RefreshProfile chamado (modo simplificado)');
    // No modo teste, não fazer nada
  }, []);

  // Inicialização da autenticação
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 [TESTE] Iniciando verificação de autenticação...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('📡 Resposta da sessão:', { session: !!session, error: sessionError });
        
        if (!mounted) return;

        if (sessionError) {
          console.error('❌ Erro na sessão:', sessionError);
          await clearAllSessions();
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('👤 Usuário encontrado, processando...');
          const processedUser = await processAuthUser(session.user);
          
          if (!mounted) return;
          
          if (processedUser) {
            console.log('✅ Usuário processado com sucesso');
            setUser(processedUser);
            setError(null);
          } else {
            console.log('⚠️ Falha ao processar usuário');
            await clearAllSessions();
            setUser(null);
            setError(null);
          }
        } else {
          console.log('❌ Nenhuma sessão encontrada');
          setUser(null);
          setError(null);
        }
        
        setLoading(false);
        console.log('🏁 Inicialização concluída');
        
      } catch (error) {
        console.error('❌ Erro geral na inicialização:', error);
        if (mounted) {
          await clearAllSessions();
          setUser(null);
          setError(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [clearAllSessions, processAuthUser]);

  // Listener para mudanças de autenticação
  useEffect(() => {
    console.log('👂 Configurando listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [LISTENER] Evento:', event, 'Sessão:', !!session);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 Usuário deslogado');
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 Usuário logado');
        setLoading(true);
        
        const processedUser = await processAuthUser(session.user);
        
        if (processedUser) {
          console.log('✅ Login processado com sucesso');
          setUser(processedUser);
          setError(null);
        } else {
          console.log('⚠️ Falha ao processar login');
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