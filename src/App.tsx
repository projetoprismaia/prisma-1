import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import OrganicBackground from './components/OrganicBackground';
import AuthForm from './components/AuthForm';
import FloatingMenu from './components/FloatingMenu';
import AdminPanel from './components/AdminPanel';
import PatientList from './components/PatientList';
import SessionListPage from './components/SessionListPage';
import SessionDetailPage from './components/SessionDetailPage';
import TranscriptionPage from './components/TranscriptionPage';
import DashboardSummaries from './components/DashboardSummaries';
import NotificationModal from './components/NotificationModal';
import { useNotification } from './hooks/useNotification';

function App() {
  const { user, loading, error, signOut, isAdmin } = useAuth();
  const { notification, hideNotification } = useNotification();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [showTranscriptionPage, setShowTranscriptionPage] = useState(false);

  const handleSignOut = () => {
    signOut().then(() => {
      // Forçar limpeza adicional do estado local após logout
      setShowAdminPanel(false);
      setShowPatientPanel(false);
      setShowSessionsPanel(false);
      setShowTranscriptionPage(false);
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
    setShowTranscriptionPage(false);
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
    setShowTranscriptionPage(false);
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
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToPatients] Navegação concluída');
  };

  const navigateToSessions = () => {
    console.log('📄 [navigateToSessions] Navegando para sessões');
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    console.log('✅ [navigateToSessions] Navegação concluída');
  };

  const navigateToSessionsWithPatient = (patientId: string) => {
    console.log('📄 [navigateToSessionsWithPatient] Navegando para sessões com filtro:', patientId);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowTranscriptionPage(false);
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
    setShowTranscriptionPage(false);
    console.log('✅ [navigateToSessionDetail] Navegação concluída');
  };

  const navigateToTranscription = () => {
    console.log('🎤 [navigateToTranscription] Navegando para transcrição');
    setShowTranscriptionPage(true);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setViewingSessionId(null);
    setSelectedPatientFilter(null);
    console.log('✅ [navigateToTranscription] Navegação concluída');
  };

  const getCurrentSection = () => {
    const section = showTranscriptionPage ? 'sessions' :
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
          {showTranscriptionPage ? (
            <TranscriptionPage
              currentUser={user}
              onBack={navigateToSessions}
            />
          ) : viewingSessionId ? (
            <SessionDetailPage
              sessionId={viewingSessionId}
              currentUser={user}
              onBack={navigateToSessions}
            />
          ) : showAdminPanel && isAdmin() ? (
            <AdminPanel currentUser={user} />
          ) : showPatientPanel && !isAdmin() ? (
            <PatientList 
              currentUser={user} 
              onNavigateToSessions={navigateToSessionsWithPatient}
            />
          ) : showSessionsPanel ? (
            <SessionListPage 
              currentUser={user} 
              initialPatientFilter={selectedPatientFilter}
              onViewSession={navigateToSessionDetail}
              onStartNewTranscription={navigateToTranscription}
            />
          ) : (
            <DashboardSummaries
              currentUser={user}
              onNavigateToPatients={navigateToPatients}
              onNavigateToSessions={navigateToSessions}
              onNavigateToAdmin={isAdmin() ? navigateToAdmin : undefined}
              onStartNewTranscription={navigateToTranscription}
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