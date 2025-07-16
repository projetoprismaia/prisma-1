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
          // Não é um erro crítico, apenas não há sessão
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Sessão encontrada, buscando perfil...');
          await fetchUserProfile(session.user);
        } else {
          console.log('👤 Nenhuma sessão ativa, mostrando login');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        if (mounted) {
          // Em caso de erro, mostrar login ao invés de travar
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
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setError(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro na mudança de auth:', error);
        if (mounted) {
          // Em caso de erro, limpar usuário e mostrar login
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

  const fetchUserProfile = async (authUser: any) => {
    try {
      console.log('👤 Buscando perfil do usuário:', authUser.id);
      
      // Try to get existing profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('📝 Perfil não existe, criando...');
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
          // Se não conseguir criar perfil, criar um temporário
          const tempProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setUser({
            id: authUser.id,
            email: authUser.email,
            profile: tempProfile
          });
          setLoading(false);
          return;
        }

        console.log('✅ Perfil criado com sucesso');
        setUser({
          id: authUser.id,
          email: authUser.email,
          profile: newProfile as UserProfile
        });
      } else if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        // Se houver erro, criar perfil temporário
        const tempProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setUser({
          id: authUser.id,
          email: authUser.email,
          profile: tempProfile
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
      // Em caso de erro crítico, criar usuário temporário
      const tempProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        profile: tempProfile
      });
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      // Mesmo com erro, limpar o estado local
      setUser(null);
      setError(null);
    }
  };

  const isAdmin = () => user?.profile?.role === 'admin';

  return {
    user,
    loading,
    error,
    signOut,
    isAdmin,
    refreshProfile: () => user && fetchUserProfile({ id: user.id, email: user.email })
  };
}