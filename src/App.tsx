import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTabVisibility } from './hooks/useTabVisibility';
import OrganicBackground from './components/OrganicBackground';
import AuthForm from './components/AuthForm';
import FloatingMenu from './components/FloatingMenu';
import AdminPanel from './components/AdminPanel';
import PatientList from './components/PatientList';
import SessionListPage from './components/SessionListPage';
import SessionDetailPage from './components/SessionDetailPage';
import ConsultationPage from './components/ConsultationPage';
import DashboardSummaries from './components/DashboardSummaries';
import NotificationModal from './components/NotificationModal';
import { useNotification } from './hooks/useNotification';

function App() {
  const { user, loading, error, signOut, isAdmin, refreshProfile } = useAuth();
  const { notification, hideNotification } = useNotification();
  const { showSuccess, showInfo } = useNotification();
  const { isTabVisible, wasTabHidden, onTabVisible } = useTabVisibility();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [showConsultationPage, setShowConsultationPage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Gerenciar recarregamento de dados quando aba volta a ficar visível
  useEffect(() => {
  useEffect(() => {
    const handleTabVisible = async () => {
      if (!user) return;
      
      console.log('👁️ [App] Aba voltou a ficar visível - iniciando revalidação');
      
      try {
        // Mostrar feedback visual
        showInfo('Atualizando dados...', 'Verificando informações mais recentes');
        
        // Pequeno delay para evitar múltiplas requisições
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Revalidar sessão do usuário
        await refreshProfile();
        
        // Disparar recarregamento de dados nos componentes
        setRefreshTrigger(prev => prev + 1);
        
        // Feedback de sucesso
        setTimeout(() => {
          showSuccess('Dados atualizados', 'Informações sincronizadas com sucesso');
        }, 1000);
        
        console.log('✅ [App] Revalidação concluída com sucesso');
      } catch (error) {
        console.error('❌ [App] Erro na revalidação:', error);
      }
    };

    // Registrar callback para quando aba voltar a ficar visível
    onTabVisible(handleTabVisible);
  }, [user, refreshProfile, onTabVisible, showInfo, showSuccess]);

  // Log para debug
  useEffect(() => {
    console.log('🔍 [App] Estado de visibilidade:', {
      isTabVisible,
      wasTabHidden,
      user: user ? user.email : 'NO_USER'
    });
  }, [isTabVisible, wasTabHidden, user]);
  const handleSignOut = () => {
    signOut().then(() => {
      // Forçar limpeza adicional do estado local após logout
      setShowAdminPanel(false);
      setShowPatientPanel(false);
      setShowSessionsPanel(false);
      setShowConsultationPage(false);
      setViewingSessionId(null);
    });
  };

  const navigateToHome = () => {
    console.log('🏠 [navigateToHome] Navegando para home');
    console.log('🔍 [navigateToHome] Estado atual:', {
      user: user ? user.id : 'NO_USER',
      showAdminPanel,
      showPatientPanel,
      showSessionsPanel,
    });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowConsultationPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToHome] Navegação concluída');
  };

  const navigateToAdmin = () => {
    console.log('⚙️ [navigateToAdmin] Navegando para admin');
    console.log('🔍 [navigateToAdmin] User role:', user?.profile?.role);
    console.log('🔍 [navigateToAdmin] isAdmin():', isAdmin());
    setShowAdminPanel(true);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowConsultationPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToAdmin] Navegação concluída');
  };

  const navigateToPatients = () => {
    console.log('👥 [navigateToPatients] Navegando para pacientes');
    console.log('🔍 [navigateToPatients] User role:', user?.profile?.role);
    setShowAdminPanel(false);
    setShowPatientPanel(true);
    setShowSessionsPanel(false);
    setShowConsultationPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToPatients] Navegação concluída');
  };

  const navigateToSessions = () => {
    console.log('📄 [navigateToSessions] Navegando para sessões');
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowConsultationPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToSessions] Navegação concluída');
  };

  const navigateToSessionsWithPatient = (patientId: string) => {
    console.log('📄 [navigateToSessionsWithPatient] Navegando para sessões com filtro:', patientId);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowConsultationPage(false);
    setSelectedPatientFilter(patientId);
    setViewingSessionId(null);
    console.log('✅ [navigateToSessionsWithPatient] Navegação concluída');
  };

  const navigateToSessionDetail = (sessionId: string) => {
    console.log('📄 [navigateToSessionDetail] Navegando para detalhes da sessão:', sessionId);
    setViewingSessionId(sessionId);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowConsultationPage(false);
    console.log('✅ [navigateToSessionDetail] Navegação concluída');
  };

  const navigateToConsultation = () => {
    console.log('🎤 [navigateToConsultation] Navegando para consulta');
    setShowConsultationPage(true);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setViewingSessionId(null);
    setSelectedPatientFilter(null);
    console.log('✅ [navigateToConsultation] Navegação concluída');
  };

  const getCurrentSection = () => {
    const section = showConsultationPage ? 'sessions' :
                   viewingSessionId ? 'sessions' :
                   showAdminPanel ? 'admin' : 
                   showPatientPanel ? 'patients' : 
                   showSessionsPanel ? 'sessions' : 'dashboard';
    console.log('🔍 [getCurrentSection] Seção atual:', section);
    return section;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-xl shadow-xl p-8 max-w-md text-center border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Verificando autenticação...</h2>
          <p className="text-gray-600 text-sm">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return (
      <>
        <OrganicBackground />
        <div className="app-content">
          <AuthForm />
        </div>
      </>
    );
  }

  // Show recording page if active
  // Main authenticated user layout with FloatingMenu always visible
  return (
    <>
      <OrganicBackground />
      <div className="app-content min-h-screen">
        <FloatingMenu
          currentUser={user}
          activeSection={getCurrentSection()}
          onNavigateToHome={navigateToHome}
          onNavigateToPatients={navigateToPatients}
          onNavigateToSessions={navigateToSessions}
          onNavigateToAdmin={navigateToAdmin}
          onSignOut={handleSignOut}
          isAdmin={isAdmin()}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Render content based on current state */}
          {showConsultationPage ? (
            <ConsultationPage
              currentUser={user}
              isTabVisible={isTabVisible}
              onBack={navigateToSessions}
            />
          ) : viewingSessionId ? (
            <SessionDetailPage
              sessionId={viewingSessionId}
              currentUser={user}
              refreshTrigger={refreshTrigger}
              onBack={navigateToSessions}
            />
          ) : showAdminPanel && isAdmin() ? (
            <AdminPanel currentUser={user} />
          ) : showPatientPanel && !isAdmin() ? (
            <PatientList 
              currentUser={user} 
              refreshTrigger={refreshTrigger}
              onNavigateToSessions={navigateToSessionsWithPatient}
            />
          ) : showSessionsPanel ? (
            <SessionListPage 
              currentUser={user} 
              refreshTrigger={refreshTrigger}
              initialPatientFilter={selectedPatientFilter}
              onViewSession={navigateToSessionDetail}
              onStartNewConsultation={navigateToConsultation}
            />
          ) : (
            <DashboardSummaries
              currentUser={user}
              refreshTrigger={refreshTrigger}
              refreshTrigger={refreshTrigger}
              onNavigateToPatients={navigateToPatients}
              onNavigateToSessions={navigateToSessions}
              onNavigateToAdmin={isAdmin() ? navigateToAdmin : undefined}
              onStartNewConsultation={navigateToConsultation}
            />
          )}
        </div>

        {/* Notification Modal */}
        <NotificationModal
          isOpen={notification.isOpen}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      </div>
    </>
  );
}

export default App;