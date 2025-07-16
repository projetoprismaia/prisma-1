import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔍 Inicializando autenticação...');
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('❌ Erro ao buscar sessão:', sessionError);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Sessão encontrada, verificando usuário...');
          await handleUserSession(session.user);
        } else {
          console.log('👤 Nenhuma sessão ativa, mostrando login');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Mudança de autenticação:', event);
      
      try {
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro na mudança de auth:', error);
        if (mounted) {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser: any) => {
    try {
      console.log('👤 Buscando perfil do usuário:', authUser.id);
      
      // Try to get existing profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        
        // Se o usuário não existe no banco (foi deletado), fazer logout
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          console.log('🚪 Usuário não encontrado no banco, fazendo logout...');
          await forceSignOut();
          return;
        }

        // Para outros erros, tentar criar perfil
        console.log('📝 Tentando criar perfil...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar perfil:', insertError);
          // Se não conseguir criar, também fazer logout
          console.log('🚪 Não foi possível criar perfil, fazendo logout...');
          await forceSignOut();
          return;
        }

        console.log('✅ Perfil criado com sucesso');
        setUser({
          id: authUser.id,
          email: authUser.email,
          profile: newProfile as UserProfile
        });
      } else {
        console.log('✅ Perfil encontrado');
        setUser({
          id: authUser.id,
          email: authUser.email,
          profile: profile as UserProfile
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro crítico ao buscar perfil:', error);
      // Em caso de erro crítico, fazer logout
      console.log('🚪 Erro crítico, fazendo logout...');
      await forceSignOut();
    }
  };

  const forceSignOut = async () => {
    try {
      console.log('🔓 Fazendo logout forçado...');
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
      setLoading(false);
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      // Mesmo com erro, limpar o estado local
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const signOut = async () => {
    await forceSignOut();
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