import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import OrganicBackground from './components/OrganicBackground';
import AuthForm from './components/AuthForm';
import FloatingMenu from './components/FloatingMenu';
import AdminPanel from './components/AdminPanel';
import PatientList from './components/PatientList';
import SessionListPage from './components/SessionListPage';
import DashboardSummaries from './components/DashboardSummaries';
import RecordingPage from './components/RecordingPage';
import NotificationModal from './components/NotificationModal';
import { useNotification } from './hooks/useNotification';

function App() {
  const { user, loading, error, signOut, isAdmin } = useAuth();
  const { notification, hideNotification } = useNotification();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string | null>(null);
  const [activeRecordingSession, setActiveRecordingSession] = useState<{
    patientId: string;
    title: string;
  } | null>(null);

  const handleSignOut = () => {
    signOut().then(() => {
      // Forçar limpeza adicional do estado local após logout
      setShowAdminPanel(false);
      setShowPatientPanel(false);
      setShowSessionsPanel(false);
      setActiveRecordingSession(null);
    });
  };

  const navigateToHome = () => {
    console.log('🏠 [navigateToHome] Navegando para home');
    console.log('🔍 [navigateToHome] Estado atual:', {
      user: user ? user.id : 'NO_USER',
      showAdminPanel,
      showPatientPanel,
      showSessionsPanel,
      activeRecordingSession: activeRecordingSession ? 'ACTIVE' : 'NONE'
    });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setSelectedPatientFilter(null);
    setActiveRecordingSession(null);
    console.log('✅ [navigateToHome] Navegação concluída');
  };

  const navigateToAdmin = () => {
    console.log('⚙️ [navigateToAdmin] Navegando para admin');
    console.log('🔍 [navigateToAdmin] User role:', user?.profile?.role);
    console.log('🔍 [navigateToAdmin] isAdmin():', isAdmin());
    setShowAdminPanel(true);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setSelectedPatientFilter(null);
    setActiveRecordingSession(null);
    console.log('✅ [navigateToAdmin] Navegação concluída');
  };

  const navigateToPatients = () => {
    console.log('👥 [navigateToPatients] Navegando para pacientes');
    console.log('🔍 [navigateToPatients] User role:', user?.profile?.role);
    setShowAdminPanel(false);
    setShowPatientPanel(true);
    setShowSessionsPanel(false);
    setSelectedPatientFilter(null);
    setActiveRecordingSession(null);
    console.log('✅ [navigateToPatients] Navegação concluída');
  };

  const navigateToSessions = () => {
    console.log('📄 [navigateToSessions] Navegando para sessões');
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setSelectedPatientFilter(null);
    setActiveRecordingSession(null);
    console.log('✅ [navigateToSessions] Navegação concluída');
  };

  const navigateToSessionsWithPatient = (patientId: string) => {
    console.log('📄 [navigateToSessionsWithPatient] Navegando para sessões com filtro:', patientId);
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setSelectedPatientFilter(patientId);
    setActiveRecordingSession(null);
    console.log('✅ [navigateToSessionsWithPatient] Navegação concluída');
  };

  const navigateToRecording = (patientId: string, title: string) => {
    console.log('🎤 [navigateToRecording] Navegando para gravação:', { patientId, title });
    setActiveRecordingSession({ patientId, title });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    console.log('✅ [navigateToRecording] Navegação concluída');
  };

  const handleRecordingComplete = () => {
    console.log('✅ [handleRecordingComplete] Gravação concluída');
    setActiveRecordingSession(null);
    // Optionally navigate to sessions list
    navigateToSessions();
    console.log('✅ [handleRecordingComplete] Redirecionamento concluído');
  };

  const handleRecordingCancel = () => {
    console.log('❌ [handleRecordingCancel] Gravação cancelada');
    setActiveRecordingSession(null);
    console.log('✅ [handleRecordingCancel] Cancelamento concluído');
  };

  const getCurrentSection = () => {
    const section = showAdminPanel ? 'admin' : 
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
  if (activeRecordingSession) {
    return (
      <>
        <OrganicBackground />
        <div className="app-content">
          <RecordingPage
            currentUser={user}
            patientId={activeRecordingSession.patientId}
            sessionTitle={activeRecordingSession.title}
            onComplete={handleRecordingComplete}
            onCancel={handleRecordingCancel}
          />
        </div>
      </>
    );
  }

  // Show admin panel if requested
  if (showAdminPanel && isAdmin()) {
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
            <AdminPanel currentUser={user} />
          </div>
        </div>
      </>
    );
  }

  // Show patient panel if requested
  if (showPatientPanel && !isAdmin()) {
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
            <PatientList 
              currentUser={user} 
              onNavigateToSessions={navigateToSessionsWithPatient}
            />
          </div>
        </div>
      </>
    );
  }

  // Show sessions panel if requested
  if (showSessionsPanel) {
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
            <SessionListPage 
              currentUser={user} 
              onStartRecording={navigateToRecording}
              initialPatientFilter={selectedPatientFilter}
            />
          </div>
        </div>
      </>
    );
  }

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
          <DashboardSummaries
            currentUser={user}
            onNavigateToPatients={navigateToPatients}
            onNavigateToSessions={navigateToSessions}
            onNavigateToAdmin={isAdmin() ? navigateToAdmin : undefined}
          />
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