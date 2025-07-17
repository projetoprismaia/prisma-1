import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Search, Filter, Plus, Edit, Trash2, Phone, AlertTriangle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types/user';
import UserFormModal, { UserFormData } from './UserFormModal';
import { useNotification } from '../hooks/useNotification';
import { formatToDDMM } from '../utils/dateFormatter';

interface AdminPanelProps {
  currentUser: any;
  refreshTrigger?: number;
}

export default function AdminPanel({ currentUser, refreshTrigger }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { showSuccess, showError, showWarning } = useNotification();
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);
      // Buscar contagem de pacientes para cada usuário
      if (usersData && usersData.length > 0) {
        // Tentar buscar pacientes como admin
        let patientsData = null;
        let patientsError = null;
        
        // Primeira tentativa: buscar todos os pacientes (admin)
        const { data: allPatients, error: allPatientsError } = await supabase
          .from('patients')
          .select('user_id');
          
        if (allPatientsError) {
          
          // Segunda tentativa: usar RPC se disponível
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('count_patients_by_user')
            .catch(() => ({ data: null, error: { message: 'RPC não disponível' } }));
            
          if (rpcError || !rpcData) {
            
            // Terceira tentativa: contar manualmente para cada usuário
            const counts: Record<string, number> = {};
            
            for (const user of usersData) {
              const { count, error: countError } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
                
              if (countError) {
                counts[user.id] = 0;
              } else {
                counts[user.id] = count || 0;
              }
            }
            setPatientCounts(counts);
            return;
          } else {
            // RPC funcionou
            const counts: Record<string, number> = {};
            usersData.forEach(user => {
              counts[user.id] = 0;
            });
            
            rpcData.forEach((item: any) => {
              counts[item.user_id] = item.patient_count;
            });
            
            setPatientCounts(counts);
            return;
          }
        } else {
          patientsData = allPatients;
          patientsError = null;
        }

        if (patientsError) {
          // Em caso de erro, inicializar com zeros
          const emptyCounts: Record<string, number> = {};
          usersData.forEach(user => {
            emptyCounts[user.id] = 0;
          });
          setPatientCounts(emptyCounts);
        } else {
          // Contar pacientes por usuário
          const counts: Record<string, number> = {};
          
          // Inicializar todos os usuários com 0
          usersData.forEach(user => {
            counts[user.id] = 0;
          });
          
          // Contar pacientes para cada usuário
          patientsData?.forEach(patient => {
            if (patient.user_id && counts.hasOwnProperty(patient.user_id)) {
              counts[patient.user_id]++;
            }
          });
          
          setPatientCounts(counts);
        }
      } else {
        setPatientCounts({});
      }
    } catch (error) {
      setPatientCounts({});
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser.id) {
      showWarning(
        'Ação Não Permitida',
        'Você não pode alterar seu próprio role de usuário.'
      );
      return;
    }

    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      showError(
        'Erro ao Atualizar',
        'Não foi possível atualizar o role do usuário. Tente novamente.'
      );
    } finally {
      setUpdating(null);
    }
  };
  const handleSaveUser = async (userData: UserFormData) => {
    setFormLoading(true);
    try {
      if (editingUser) {
        // Editing existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: userData.full_name,
            whatsapp: userData.whatsapp,
            role: userData.role
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        // Update local state
        setUsers(users.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                full_name: userData.full_name,
                whatsapp: userData.whatsapp,
                role: userData.role 
              }
            : user
        ));
      } else {
        // Creating new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password!,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Update the profile with additional data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: userData.full_name,
              whatsapp: userData.whatsapp,
              role: userData.role
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;

          // Refresh the users list
          await fetchUsers();
        }
      }

      // Invalidar cache após mudanças
      dataCache.invalidate(cacheKeys.users());
      dataCache.invalidate(cacheKeys.userPatientCounts());
      dataCache.invalidate(cacheKeys.dashboardAdmin());
      
      setShowUserFormModal(false);
      setEditingUser(null);
    } catch (error: any) {
      showError(
        'Erro ao Salvar Usuário',
        `Não foi possível salvar o usuário: ${error.message}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      showWarning(
        'Ação Não Permitida',
        'Você não pode deletar sua própria conta.'
      );
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId));
      setDeleteConfirm(null);
      
      // Invalidar cache após exclusão
      dataCache.invalidate(cacheKeys.users());
      dataCache.invalidate(cacheKeys.userPatientCounts());
      dataCache.invalidate(cacheKeys.dashboardAdmin());
      
      showSuccess(
        'Usuário Deletado',
        'O usuário foi removido com sucesso do sistema.'
      );
    } catch (error: any) {
      showError(
        'Erro ao Deletar',
        `Não foi possível deletar o usuário: ${error.message}`
      );
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setShowUserFormModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setShowUserFormModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.whatsapp?.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: UserRole) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getRoleIcon = (role: UserRole) => {
    return role === 'admin' ? Shield : UserCheck;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Gerenciamento de Usuários</h2>
              <p className="text-sm text-gray-600">Psiquiatras e Psicólogos do sistema</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Usuário</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Todos os tipos</option>
              <option value="user">Usuários</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Total de Usuários</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Administradores</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">Total de Pacientes</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-2xl font-bold text-indigo-900">
                {Object.keys(patientCounts).length > 0 
                  ? Object.values(patientCounts).reduce((sum, count) => sum + count, 0)
                  : '...'
                }
              </p>
              {Object.keys(patientCounts).length > 0 && (
                <button
                  onClick={fetchUsers}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                  title="Atualizar contagem"
                >
                  ↻ Atualizar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <RoleIcon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.full_name || 'Nome não informado'}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.whatsapp && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.whatsapp}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <p>Criado em: {formatToDDMM(user.created_at)}</p>
                        <p className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          <span className="font-medium">
                            {patientCounts[user.id] !== undefined ? patientCounts[user.id] : '...'}
                          </span>
                          <span className="ml-1">
                            {patientCounts[user.id] === 1 ? 'paciente' : 'pacientes'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Profissional'}
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {user.id !== currentUser.id && (
                        <>
                          <button
                            onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            disabled={updating === user.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            } disabled:opacity-50`}
                            title={user.role === 'admin' ? 'Remover privilégios de admin' : 'Tornar administrador'}
                          >
                            {updating === user.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'
                            )}
                          </button>

                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Deletar usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showUserFormModal}
        onClose={() => {
          setShowUserFormModal(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        editingUser={editingUser}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-xl shadow-2xl p-6 max-w-md w-full border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja deletar este usuário? Todos os dados relacionados serão perdidos permanentemente.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}