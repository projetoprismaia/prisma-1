import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';
import { logger } from '../utils/logger';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  logger.debug('AUTH', 'useAuth hook inicializado');

  // Função para limpar todas as sessões - movida para escopo principal
  const clearAllSessions = async () => {
    try {
      logger.info('AUTH', 'Iniciando limpeza de todas as sessões');
      
      // Limpar localStorage do Supabase
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
          logger.debug('AUTH', 'Removido do localStorage', { key });
        }
      });

      // Limpar sessionStorage do Supabase
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
          logger.debug('AUTH', 'Removido do sessionStorage', { key });
        }
      });

      // Forçar logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('AUTH', 'Erro no signOut do Supabase', error);
      } else {
        logger.info('AUTH', 'SignOut do Supabase executado com sucesso');
      }
      
      logger.info('AUTH', 'Todas as sessões foram limpas com sucesso');
    } catch (error) {
      logger.error('AUTH', 'Erro crítico ao limpar sessões', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let isProcessing = false;

    logger.debug('AUTH', 'useAuth useEffect iniciado');

    const initializeAuth = async () => {
      if (isProcessing || !mounted) return;
      isProcessing = true;

      try {
        logger.info('AUTH', 'Inicializando autenticação', { mounted, isProcessing });
        
        // Verificar sessão atual
        logger.debug('SUPABASE', 'Buscando sessão atual');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        logger.info('AUTH', 'Sessão obtida', {
          session: session ? 'EXISTS' : 'NULL',
          user: session?.user ? session.user.id : 'NO_USER',
          sessionError: sessionError?.message || 'NO_ERROR',
          timestamp: new Date().toISOString()
        });
        
        if (!mounted) return;
        
        if (sessionError) {
          logger.error('AUTH', 'Erro ao buscar sessão', sessionError);
          await clearAllSessions();
          if (mounted) {
            setUser(null);
            setError(null);
            setLoading(false);
            logger.info('AUTH', 'Estado limpo após erro de sessão');
          }
          return;
        }
        
        if (session?.user) {
          logger.info('AUTH', 'Sessão encontrada, verificando usuário', {
            userId: session.user.id,
            email: session.user.email,
            lastSignIn: session.user.last_sign_in_at
          });
          await handleUserSession(session.user);
        } else {
          logger.info('AUTH', 'Nenhuma sessão ativa encontrada');
          if (mounted) {
            setUser(null);
            setError(null);
            setLoading(false);
            logger.info('AUTH', 'Estado definido para não autenticado');
          }
        }
      } catch (error) {
        logger.error('AUTH', 'Erro crítico na inicialização', error);
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
          logger.info('AUTH', 'Estado limpo após erro crítico');
        }
      } finally {
        isProcessing = false;
        logger.debug('AUTH', 'initializeAuth finalizado', { isProcessing });
      }
    };

    const handleUserSession = async (authUser: any) => {
      if (!mounted) return;

      try {
        logger.info('AUTH', 'Iniciando handleUserSession', {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        });
        
        // Tentar buscar perfil existente
        logger.debug('SUPABASE', 'Buscando perfil do usuário', { userId: authUser.id });
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        logger.info('AUTH', 'Resultado da busca de perfil', {
          profile: profile ? 'FOUND' : 'NOT_FOUND',
          error: error?.message || 'NO_ERROR',
          errorCode: error?.code || 'NO_CODE'
        });

        if (!mounted) return;

        if (error) {
          logger.error('AUTH', 'Erro ao buscar perfil', { 
            error: error.message, 
            code: error.code,
            userId: authUser.id 
          });
          
          // Se usuário não existe no banco, limpar tudo e fazer logout
          if (error.code === 'PGRST116' || 
              error.message?.includes('No rows found') ||
              error.message?.includes('relation "profiles" does not exist')) {
            logger.warn('AUTH', 'Usuário não encontrado no banco, forçando logout', {
              userId: authUser.id,
              errorCode: error.code
            });
            await clearAllSessions();
            if (mounted) {
              setUser(null);
              setError(null);
              setLoading(false);
              logger.info('AUTH', 'Estado limpo - usuário não encontrado');
            }
            return;
          }

          // Para outros erros, tentar criar perfil
          logger.info('AUTH', 'Tentando criar perfil para usuário', { userId: authUser.id });
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

          logger.info('AUTH', 'Resultado da criação de perfil', {
            newProfile: newProfile ? 'CREATED' : 'FAILED',
            insertError: insertError?.message || 'NO_ERROR',
            userId: authUser.id
          });

          if (!mounted) return;

          if (insertError) {
            logger.error('AUTH', 'Falha ao criar perfil, forçando logout', {
              error: insertError.message,
              code: insertError.code,
              userId: authUser.id
            });
            
            await clearAllSessions();
            if (mounted) {
              setUser(null);
              setError(null);
              setLoading(false);
              logger.info('AUTH', 'Estado limpo após falha na criação de perfil');
            }
            return;
          }

          logger.info('AUTH', 'Perfil criado com sucesso', { 
            userId: authUser.id,
            profileId: newProfile.id 
          });
          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: newProfile as UserProfile
            });
            setLoading(false);
            logger.info('AUTH', 'Usuário autenticado com perfil criado', { userId: authUser.id });
          }
        } else {
          logger.info('AUTH', 'Perfil encontrado com sucesso', {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            full_name: profile.full_name,
            created_at: profile.created_at
          });
          if (mounted) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              profile: profile as UserProfile
            });
            setLoading(false);
            logger.info('AUTH', 'Usuário autenticado com perfil existente', { 
              userId: authUser.id,
              role: profile.role 
            });
          }
        }
      } catch (error) {
        logger.error('AUTH', 'Erro crítico em handleUserSession', {
          error,
          userId: authUser.id,
          stack: error instanceof Error ? error.stack : undefined
        });
        await clearAllSessions();
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
          logger.info('AUTH', 'Estado limpo após erro crítico em handleUserSession');
        }
      }
    };

    // Inicializar
    logger.info('AUTH', 'Iniciando inicialização de autenticação');
    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isProcessing) return;
      
      logger.info('AUTH', 'Mudança de estado de autenticação', {
        event,
        session: session ? 'EXISTS' : 'NULL',
        user: session?.user ? session.user.id : 'NO_USER',
        mounted,
        isProcessing,
        timestamp: new Date().toISOString()
      });
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        logger.info('AUTH', 'Evento de logout detectado', { event });
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
          logger.info('AUTH', 'Estado limpo - redirecionando para login');
        }
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        logger.info('AUTH', 'Evento de login detectado', { 
          userId: session.user.id,
          email: session.user.email 
        });
        await handleUserSession(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      logger.debug('AUTH', 'useAuth cleanup executado');
    };
  }, []);

  // Log adicional para monitorar mudanças no estado do usuário
  useEffect(() => {
    logger.info('AUTH', 'Estado do usuário alterado', {
      user: user ? `${user.email} (${user.id})` : 'NULL',
      loading,
      shouldShowLogin: !user && !loading,
      timestamp: new Date().toISOString()
    });
    
    if (!user && !loading) {
      logger.info('AUTH', 'Usuário deslogado - deve mostrar tela de login');
    }
  }, [user, loading]);

  const signOut = async () => {
    try {
      logger.info('AUTH', 'Iniciando processo de logout', {
        currentUser: user ? user.email : 'NULL',
        userId: user?.id
      });
      
      // Usar a função centralizada de limpeza
      await clearAllSessions();
      
      logger.info('AUTH', 'Logout realizado com sucesso');
    } catch (error) {
      logger.error('AUTH', 'Erro durante logout', error);
      // Forçar limpeza do estado mesmo com erro
      await clearAllSessions();
      
      // Forçar atualização do estado se o onAuthStateChange não disparar
      logger.warn('AUTH', 'Forçando limpeza do estado devido ao erro');
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const isAdmin = () => user?.profile?.role === 'admin';

  // Log do resultado final do hook
  logger.debug('AUTH', 'useAuth hook retornando', {
    hasUser: !!user,
    loading,
    hasError: !!error,
    isAdmin: isAdmin()
  });
  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile: () => user && handleUserSession({ id: user.id, email: user.email })
  };
}