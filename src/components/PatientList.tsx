import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, UserX, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Patient, PatientFormData } from '../types/patient';
import { AuthUser } from '../types/user';
import PatientFormModal from './PatientFormModal';
import { useNotification } from '../hooks/useNotification';
import { formatToDDMM } from '../utils/dateFormatter';
import { logger } from '../utils/logger';

interface PatientListProps {
  currentUser: AuthUser;
  onNavigateToSessions?: (patientId: string) => void;
}

export default function PatientList({ currentUser, onNavigateToSessions }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientFormModal, setShowPatientFormModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    logger.info('UI', 'PatientList montado', { userId: currentUser.id });
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      logger.dataLoad('PatientList', 'start', { userId: currentUser.id }, currentUser.id);
      logger.supabaseCall('fetch patients', 'patients', 'start', undefined, currentUser.id);
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.supabaseCall('fetch patients', 'patients', 'error', error, currentUser.id);
        throw error;
      }
      
      logger.supabaseCall('fetch patients', 'patients', 'success', { count: data?.length }, currentUser.id);
      setPatients(data || []);
      logger.dataLoad('PatientList', 'success', { patientsCount: data?.length }, currentUser.id);
    } catch (error) {
      logger.dataLoad('PatientList', 'error', error, currentUser.id);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePatient = async (patientData: PatientFormData) => {
    setFormLoading(true);
    logger.info('DATA', 'Iniciando salvamento de paciente', {
      isEditing: !!editingPatient,
      patientName: patientData.name
    }, currentUser.id);
    
    try {
      if (editingPatient) {
        // Editing existing patient
        logger.supabaseCall('update patient', 'patients', 'start', { patientId: editingPatient.id }, currentUser.id);
        const { error } = await supabase
          .from('patients')
          .update({
            name: patientData.name,
            email: patientData.email || null,
            whatsapp: patientData.whatsapp || null
          })
          .eq('id', editingPatient.id);

        if (error) {
          logger.supabaseCall('update patient', 'patients', 'error', error, currentUser.id);
          throw error;
        }
        
        logger.supabaseCall('update patient', 'patients', 'success', { patientId: editingPatient.id }, currentUser.id);

        // Update local state
        setPatients(patients.map(patient => 
          patient.id === editingPatient.id 
            ? { 
                ...patient, 
                name: patientData.name,
                email: patientData.email || null,
                whatsapp: patientData.whatsapp || null,
                updated_at: new Date().toISOString()
              }
            : patient
        ));
      } else {
        // Creating new patient
        logger.supabaseCall('create patient', 'patients', 'start', { patientName: patientData.name }, currentUser.id);
        const { data, error } = await supabase
          .from('patients')
          .insert({
            name: patientData.name,
            email: patientData.email || null,
            whatsapp: patientData.whatsapp || null,
            user_id: currentUser.id
          })
          .select()
          .single();

        if (error) {
          logger.supabaseCall('create patient', 'patients', 'error', error, currentUser.id);
          throw error;
        }
        
        logger.supabaseCall('create patient', 'patients', 'success', { patientId: data.id }, currentUser.id);

        // Add to local state
        setPatients([data, ...patients]);
      }

      setShowPatientFormModal(false);
      setEditingPatient(null);
      logger.info('DATA', 'Paciente salvo com sucesso', {
        isEditing: !!editingPatient,
        patientName: patientData.name
      }, currentUser.id);
      showSuccess(
        editingPatient ? 'Paciente Atualizado' : 'Paciente Criado',
        editingPatient 
          ? 'Os dados do paciente foram atualizados com sucesso.'
          : 'O novo paciente foi adicionado com sucesso.'
      );
    } catch (error: any) {
      logger.error('DATA', 'Erro ao salvar paciente', error, currentUser.id);
      showError(
        'Erro ao Salvar',
        `Não foi possível salvar o paciente: ${error.message}`
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      logger.info('DATA', 'Iniciando exclusão de paciente', { patientId }, currentUser.id);
      logger.supabaseCall('delete patient', 'patients', 'start', { patientId }, currentUser.id);
      
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        logger.supabaseCall('delete patient', 'patients', 'error', error, currentUser.id);
        throw error;
      }
      
      logger.supabaseCall('delete patient', 'patients', 'success', { patientId }, currentUser.id);

      // Remove from local state
      setPatients(patients.filter(patient => patient.id !== patientId));
      setDeleteConfirm(null);
      logger.info('DATA', 'Paciente excluído com sucesso', { patientId }, currentUser.id);
      showSuccess(
        'Paciente Removido',
        'O paciente foi removido com sucesso do sistema.'
      );
    } catch (error: any) {
      logger.error('DATA', 'Erro ao deletar paciente', error, currentUser.id);
      showError(
        'Erro ao Deletar',
        `Não foi possível deletar o paciente: ${error.message}`
      );
    }
  };

  const openEditModal = (patient: Patient) => {
    logger.uiEvent('PatientList', 'Edit modal opened', { patientId: patient.id }, currentUser.id);
    setEditingPatient(patient);
    setShowPatientFormModal(true);
  };

  const openCreateModal = () => {
    logger.uiEvent('PatientList', 'Create modal opened', undefined, currentUser.id);
    setEditingPatient(null);
    setShowPatientFormModal(true);
  };

  const handlePatientClick = (patientId: string) => {
    logger.uiEvent('PatientList', 'Patient clicked', { patientId }, currentUser.id);
    if (onNavigateToSessions) {
      onNavigateToSessions(patientId);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return patient.name.toLowerCase().includes(searchLower) ||
           (patient.email?.toLowerCase().includes(searchLower)) ||
           (patient.whatsapp?.includes(searchTerm));
  });

  if (loading) {
    logger.debug('UI', 'PatientList mostrando loading');
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

  logger.debug('UI', 'PatientList renderizando dados', {
    totalPatients: patients.length,
    filteredPatients: filteredPatients.length,
    searchTerm
  });
  return (
    <>
      <div className="glass-card rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Meus Pacientes</h2>
              <p className="text-sm text-gray-600">Gerencie seus pacientes</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Paciente</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Total de Pacientes</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 mt-1">{patients.length}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">Resultados da Busca</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{filteredPatients.length}</p>
          </div>
        </div>

        {/* Patient List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateModal}
                  className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Adicionar primeiro paciente
                </button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handlePatientClick(patient.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{patient.name}</p>
                    {patient.email && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {patient.email}
                      </p>
                    )}
                    {patient.whatsapp && (
                      <p className="text-xs text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {patient.whatsapp}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Cadastrado em: {formatToDDMM(patient.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(patient)}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(patient);
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    title="Editar paciente"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(patient.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Deletar paciente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Patient Form Modal */}
      <PatientFormModal
        isOpen={showPatientFormModal}
        onClose={() => {
          setShowPatientFormModal(false);
          setEditingPatient(null);
        }}
        onSave={handleSavePatient}
        editingPatient={editingPatient}
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
              Tem certeza que deseja deletar este paciente? Todos os dados relacionados serão perdidos permanentemente.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePatient(deleteConfirm)}
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