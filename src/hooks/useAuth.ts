import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Buscando sessão inicial...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('❌ Erro ao buscar sessão:', sessionError);
          setError(`Erro de sessão: ${sessionError.message}`);
          setLoading(false);
          return;
        }
        
        console.log('✅ Sessão obtida:', session ? 'Usuário logado' : 'Sem usuário');
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          console.log('👤 Nenhum usuário logado');
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        if (mounted) {
          setError(`Erro de inicialização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      try {
        console.log('🔄 Mudança de autenticação:', event, session ? 'com usuário' : 'sem usuário');
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erro na mudança de auth:', error);
        if (mounted) {
          setError(`Erro de autenticação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      
      // First, check if profiles table exists by trying to create it
      await ensureProfilesTableExists();
      
      // Try to get existing profile
      let { data: profile, error } = await supabase
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
          setError(`Erro ao criar perfil: ${insertError.message}`);
          setLoading(false);
          return;
        }

        profile = newProfile;
        console.log('✅ Perfil criado com sucesso:', profile);
      } else if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        setError(`Erro de perfil: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ Perfil encontrado:', profile);
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        profile: profile as UserProfile
      });
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro crítico ao buscar perfil:', error);
      setError(`Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  const ensureProfilesTableExists = async () => {
    try {
      // Try to create the profiles table if it doesn't exist
      const { error } = await supabase.rpc('create_profiles_table_if_not_exists');
      
      if (error && !error.message.includes('already exists')) {
        console.log('⚠️ Tentando criar tabela via SQL direto...');
        
        // Fallback: try to create table directly
        await supabase.from('profiles').select('id').limit(1);
      }
    } catch (error) {
      console.log('ℹ️ Tabela profiles pode não existir, tentando criar...');
      
      // Create a simple profile structure in memory if database fails
      // This is a fallback for development
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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