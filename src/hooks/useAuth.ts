import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log('🔍 INIT AUTH: Iniciando verificação de autenticação');
      try {
        console.log('🚀 Iniciando autenticação...');
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔍 SESSION CHECK:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: sessionError?.message
        });
        
        if (sessionError) {
          console.error('❌ SESSION ERROR:', sessionError);
          console.error('❌ Erro na sessão:', sessionError);
          if (mounted) {
            setUser(null);
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('👤 USER FOUND:', session.user.email);
          
          console.log('👤 Usuário encontrado:', session.user.email);
          
          // Tentar buscar perfil do usuário
          console.log('🔍 FETCHING PROFILE...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('🔍 PROFILE RESULT:', {
            hasProfile: !!profile,
            error: profileError?.message
          });

          if (mounted) {
            if (profileError) {
              console.log('⚠️ Perfil não encontrado, criando usuário básico...');
              // Se não encontrou perfil, criar usuário básico
              setUser({
                id: session.user.id,
                email: session.user.email,
                profile: {
                  id: session.user.id,
                  email: session.user.email,
                  role: 'user',
                  full_name: session.user.user_metadata?.full_name || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as UserProfile
              });
            } else {
              console.log('✅ Perfil encontrado:', profile.email);
              setUser({
                id: session.user.id,
                email: session.user.email,
                profile: profile as UserProfile
              });
            }
            setError(null);
            setLoading(false);
          }
        } else {
          console.log('❌ Nenhuma sessão encontrada');
          if (mounted) {
            setUser(null);
            setError(null);
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error('❌ Erro geral na autenticação:', err);
        if (mounted) {
          setUser(null);
          setError(err.message);
          setLoading(false);
        }
      }
    };

    // Inicializar autenticação
    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Mudança de autenticação:', event);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 Usuário deslogado');
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 Usuário logado:', session.user.email);
        setLoading(true);
        
        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.log('⚠️ Perfil não encontrado no login');
          setUser({
            id: session.user.id,
            console.log('⚠️ PROFILE NOT FOUND, creating basic user');
            email: session.user.email,
            profile: {
              id: session.user.id,
              email: session.user.email,
              role: 'user',
            console.log('✅ PROFILE LOADED:', profile.email);
              full_name: session.user.user_metadata?.full_name || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as UserProfile
          });
        } else {
          console.log('✅ Perfil carregado no login');
          setUser({
            id: session.user.id,
          console.log('❌ NO SESSION FOUND');
            email: session.user.email,
            profile: profile as UserProfile
          });
        }
        
        setError(null);
        setLoading(false);
        console.error('❌ INIT AUTH ERROR:', err);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Sem dependências - executa apenas uma vez

  const signOut = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
      setLoading(false);
      console.log('✅ Logout concluído');
    } catch (err: any) {
      console.error('❌ Erro no logout:', err);
      setError(err.message);
    }
  };

  const isAdmin = () => {
    const result = user?.profile?.role === 'admin';
    console.log('🔍 IS ADMIN CHECK:', result);
    return result;
          console.log('⚠️ PROFILE NOT FOUND ON SIGN IN');
  };

  const refreshProfile = async () => {
    if (!user) return;
    console.log('🔄 REFRESHING PROFILE...');
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      console.log('🔍 REFRESH PROFILE RESULT:', {
        hasProfile: !!profile,
        error: error?.message
      });


        console.log('✅ PROFILE REFRESHED');
      console.log('🔄 AUTH STATE CHANGE:', event);
          console.log('✅ PROFILE LOADED ON SIGN IN');
      if (!error && profile) {
        setUser({
        console.log('🚪 USER SIGNED OUT');
          id: user.id,
        console.log('🔑 USER SIGNED IN:', session.user.email);
      console.error('❌ REFRESH PROFILE ERROR:', err);
          email: user.email,
          profile: profile as UserProfile
        console.log('🔍 FETCHING PROFILE ON SIGN IN...');
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    }
      console.log('🧹 CLEANUP AUTH');
  };

        console.log('🔍 PROFILE ON SIGN IN:', {
          hasProfile: !!profile,
          error: profileError?.message
        });

      console.log('🚪 SIGNING OUT...');
  return {
    user,
    loading,
    error,
      console.log('✅ SIGNED OUT SUCCESSFULLY');
    signOut,
      console.error('❌ SIGN OUT ERROR:', err);
    isAdmin,
    refreshProfile
  };
}