import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Search, Filter, Plus, Edit, Trash2, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types/user';
import UserFormModal, { UserFormData } from './UserFormModal';

interface AdminPanelProps {
  currentUser: any;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser.id) {
      alert('Você não pode alterar seu próprio role!');
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
      console.error('Erro ao atualizar role:', error);
      alert('Erro ao atualizar role do usuário');
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

      setShowUserFormModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert(`Erro ao salvar usuário: ${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      alert('Você não pode deletar sua própria conta!');
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
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      alert(`Erro ao deletar usuário: ${error.message}`);
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
      <div className="bg-white rounded-xl shadow-lg p-6">
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total de Usuários</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{users.length}</p>
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
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Profissionais</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {users.filter(u => u.role === 'user').length}
            </p>
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
                      <p className="text-xs text-gray-500">
                        Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Profissional'}
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
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
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
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