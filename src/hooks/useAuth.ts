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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // Buscar perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!mounted) return;

          if (profileError) {
            // Se perfil não existe, criar um básico
            if (profileError.code === 'PGRST116') {
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'user',
                  full_name: session.user.user_metadata?.full_name || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (!mounted) return;

              if (insertError) {
                setError('Erro ao criar perfil do usuário');
                setLoading(false);
                return;
              }

              setUser({
                id: session.user.id,
                email: session.user.email,
                profile: newProfile as UserProfile
              });
            } else {
              setError('Erro ao carregar perfil do usuário');
            }
            setLoading(false);
            return;
          }

          // Perfil carregado com sucesso
          setUser({
            id: session.user.id,
            email: session.user.email,
            profile: profile as UserProfile
          });
        } else {
          setUser(null);
        }
        
        setLoading(false);
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Erro na autenticação');
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        
        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!mounted) return;

        if (profileError || !profile) {
          setError('Erro ao carregar perfil');
          setLoading(false);
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email,
          profile: profile as UserProfile
        });
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Dependências vazias - executa apenas uma vez

  const signOut = async () => {
    try {
      setLoading(true);
      
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

      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpar estado
      setUser(null);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      // Forçar limpeza mesmo com erro
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user?.profile?.role === 'admin';
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // Verificar se ainda há sessão válida
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        setUser(null);
        setError(null);
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
    } catch (err) {
      // Silenciar erros de refresh
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