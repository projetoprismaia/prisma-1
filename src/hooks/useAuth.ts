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
      try {
        console.log('🚀 Iniciando autenticação...');
        
        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Erro na sessão:', sessionError);
          if (mounted) {
            setUser(null);
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('👤 Usuário encontrado:', session.user.email);
          
          // Tentar buscar perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

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
          console.log('✅ Perfil carregado no login');
          setUser({
            id: session.user.id,
            email: session.user.email,
            profile: profile as UserProfile
          });
        }
        
        setError(null);
        setLoading(false);
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
    return user?.profile?.role === 'admin';
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setUser({
          id: user.id,
          email: user.email,
          profile: profile as UserProfile
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
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