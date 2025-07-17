import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { logger } from './utils/logger';
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
import DebugPanel from './components/DebugPanel';

function App() {
  const { user, loading, error, signOut, isAdmin } = useAuth();
  const { notification, hideNotification } = useNotification();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [showTranscriptionPage, setShowTranscriptionPage] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Log inicial do App
  React.useEffect(() => {
    logger.info('UI', 'App component montado', {
      hasUser: !!user,
      loading,
      hasError: !!error
    });
  }, []);

  // Log mudanças de estado do usuário
  React.useEffect(() => {
    logger.info('UI', 'Estado do usuário mudou no App', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      role: user?.profile?.role,
      loading
    });
  }, [user, loading]);
  const handleSignOut = () => {
  // Atalho de teclado para abrir debug panel
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + Shift + D para abrir debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setShowDebugPanel(true);
        logger.info('UI', 'Debug panel aberto via atalho de teclado');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
    logger.info('NAV', 'Usuário clicou em sair', { userId: user?.id });
    signOut().then(() => {
      // Forçar limpeza adicional do estado local após logout
      setShowAdminPanel(false);
      setShowPatientPanel(false);
      setShowSessionsPanel(false);
      setShowTranscriptionPage(false);
      setViewingSessionId(null);
      logger.info('NAV', 'Estado local limpo após logout');
    });
  };

  const navigateToHome = () => {
    logger.navigationEvent(getCurrentSection(), 'dashboard', user?.id);
    logger.debug('NAV', 'Navegando para home - estado atual', {
      user: user ? user.id : 'NO_USER',
      showAdminPanel,
      showPatientPanel,
      showSessionsPanel
    });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    logger.info('NAV', 'Navegação para home concluída');
  };

  const navigateToAdmin = () => {
    logger.navigationEvent(getCurrentSection(), 'admin', user?.id);
    logger.info('NAV', 'Navegando para admin', {
      userRole: user?.profile?.role,
      isAdmin: isAdmin()
    });
    setShowAdminPanel(true);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    logger.info('NAV', 'Navegação para admin concluída');
  };

  const navigateToPatients = () => {
    logger.navigationEvent(getCurrentSection(), 'patients', user?.id);
    logger.info('NAV', 'Navegando para pacientes', { userRole: user?.profile?.role });
    setShowAdminPanel(false);
    setShowPatientPanel(true);
    setShowSessionsPanel(false);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    logger.info('NAV', 'Navegação para pacientes concluída');
  };

  const navigateToSessions = () => {
    logger.navigationEvent(getCurrentSection(), 'sessions', user?.id);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(null);
    setViewingSessionId(null);
    logger.info('NAV', 'Navegação para sessões concluída');
  };

  const navigateToSessionsWithPatient = (patientId: string) => {
    logger.navigationEvent(getCurrentSection(), 'sessions-filtered', user?.id);
    logger.info('NAV', 'Navegando para sessões com filtro de paciente', { patientId });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setShowTranscriptionPage(false);
    setSelectedPatientFilter(patientId);
    setViewingSessionId(null);
    logger.info('NAV', 'Navegação para sessões filtradas concluída');
  };

  const navigateToSessionDetail = (sessionId: string) => {
    logger.navigationEvent(getCurrentSection(), 'session-detail', user?.id);
    logger.info('NAV', 'Navegando para detalhes da sessão', { sessionId });
    setViewingSessionId(sessionId);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setShowTranscriptionPage(false);
    logger.info('NAV', 'Navegação para detalhes da sessão concluída');
  };

  const navigateToTranscription = () => {
    logger.navigationEvent(getCurrentSection(), 'transcription', user?.id);
    setShowTranscriptionPage(true);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setViewingSessionId(null);
    setSelectedPatientFilter(null);
    logger.info('NAV', 'Navegação para transcrição concluída');
  };

  const getCurrentSection = () => {
    const section = showTranscriptionPage ? 'sessions' :
                   viewingSessionId ? 'sessions' :
                   showAdminPanel ? 'admin' : 
                   showPatientPanel ? 'patients' : 
                   showSessionsPanel ? 'sessions' : 'dashboard';
    logger.debug('NAV', 'Seção atual determinada', { section });
    return section;
  };

  // Loading state
  if (loading) {
    logger.info('UI', 'Mostrando tela de loading');
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
    logger.info('UI', 'Mostrando tela de autenticação - usuário não logado');
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
  logger.info('UI', 'Renderizando interface principal autenticada', {
    currentSection: getCurrentSection(),
    userId: user.id
  });

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
            logger.debug('UI', 'Renderizando TranscriptionPage') &&
            <TranscriptionPage
              currentUser={user}
              onBack={navigateToSessions}
            />
          ) : viewingSessionId ? (
            logger.debug('UI', 'Renderizando SessionDetailPage', { sessionId: viewingSessionId }) &&
            <SessionDetailPage
              sessionId={viewingSessionId}
              currentUser={user}
              onBack={navigateToSessions}
            />
          ) : showAdminPanel && isAdmin() ? (
            logger.debug('UI', 'Renderizando AdminPanel') &&
            <AdminPanel currentUser={user} />
          ) : showPatientPanel && !isAdmin() ? (
            logger.debug('UI', 'Renderizando PatientList') &&
            <PatientList 
              currentUser={user} 
              onNavigateToSessions={navigateToSessionsWithPatient}
            />
          ) : showSessionsPanel ? (
            logger.debug('UI', 'Renderizando SessionListPage', { patientFilter: selectedPatientFilter }) &&
            <SessionListPage 
              currentUser={user} 
              initialPatientFilter={selectedPatientFilter}
              onViewSession={navigateToSessionDetail}
              onStartNewTranscription={navigateToTranscription}
            />
          ) : (
            logger.debug('UI', 'Renderizando DashboardSummaries') &&
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

        {/* Debug Panel */}
        <DebugPanel
          isOpen={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
        />
      </div>
    </>
  );
}

export default App;