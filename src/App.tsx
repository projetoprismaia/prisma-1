import React, { useState } from 'react';
import { BarChart3, FileText, Settings, Users } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import OrganicBackground from './components/OrganicBackground';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
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
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setActiveRecordingSession(null);
  };

  const navigateToAdmin = () => {
    setShowAdminPanel(true);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
    setActiveRecordingSession(null);
  };

  const navigateToPatients = () => {
    setShowAdminPanel(false);
    setShowPatientPanel(true);
    setShowSessionsPanel(false);
    setActiveRecordingSession(null);
  };

  const navigateToSessions = () => {
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(true);
    setActiveRecordingSession(null);
  };

  const navigateToRecording = (patientId: string, title: string) => {
    setActiveRecordingSession({ patientId, title });
    setShowAdminPanel(false);
    setShowPatientPanel(false);
    setShowSessionsPanel(false);
  };

  const handleRecordingComplete = () => {
    setActiveRecordingSession(null);
    // Optionally navigate to sessions list
    navigateToSessions();
  };

  const handleRecordingCancel = () => {
    setActiveRecordingSession(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
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
          {/* Header */}
          <header className="glass-card shadow-lg border-b border-blue-200 relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                    <p className="text-sm text-gray-600">Painel Administrativo</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Navigation Menu */}
                  <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={navigateToHome}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        !showAdminPanel && !showPatientPanel && !showSessionsPanel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </button>
                    
                    {!isAdmin() && (
                      <button
                        onClick={navigateToPatients}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showPatientPanel
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        <span>Pacientes</span>
                      </button>
                    )}
                    
                    <button
                      onClick={navigateToSessions}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showSessionsPanel
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Sessões</span>
                    </button>
                    
                    {isAdmin() && (
                      <button
                        onClick={navigateToAdmin}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showAdminPanel
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin</span>
                      </button>
                    )}
                  </nav>
                  
                  <UserProfile user={user} onSignOut={signOut} />
                </div>
              </div>
            </div>
          </header>

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
          {/* Header */}
          <header className="glass-card shadow-lg border-b border-blue-200 relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                    <p className="text-sm text-gray-600">Gerenciamento de Pacientes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Navigation Menu */}
                  <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={navigateToHome}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        !showAdminPanel && !showPatientPanel && !showSessionsPanel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </button>
                    
                    {!isAdmin() && (
                      <button
                        onClick={navigateToPatients}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showPatientPanel
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        <span>Pacientes</span>
                      </button>
                    )}
                    
                    <button
                      onClick={navigateToSessions}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showSessionsPanel
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Sessões</span>
                    </button>
                    
                    {isAdmin() && (
                      <button
                        onClick={navigateToAdmin}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showAdminPanel
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin</span>
                      </button>
                    )}
                  </nav>
                  
                  <UserProfile user={user} onSignOut={signOut} />
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PatientList currentUser={user} />
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
          {/* Header */}
          <header className="glass-card shadow-lg border-b border-blue-200 relative z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                    <p className="text-sm text-gray-600">Sessões de Transcrição</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Navigation Menu */}
                  <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={navigateToHome}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        !showAdminPanel && !showPatientPanel && !showSessionsPanel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </button>
                    
                    {!isAdmin() && (
                      <button
                        onClick={navigateToPatients}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showPatientPanel
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        <span>Pacientes</span>
                      </button>
                    )}
                    
                    <button
                      onClick={navigateToSessions}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showSessionsPanel
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Sessões</span>
                    </button>
                    
                    {isAdmin() && (
                      <button
                        onClick={navigateToAdmin}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          showAdminPanel
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin</span>
                      </button>
                    )}
                  </nav>
                  
                  <UserProfile user={user} onSignOut={signOut} />
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SessionListPage currentUser={user} onStartRecording={navigateToRecording} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OrganicBackground />
      <div className="app-content min-h-screen">
        {/* Header */}
        <header className="glass-card shadow-lg border-b border-blue-200 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Prisma IA</h1>
                  <p className="text-sm text-gray-600">Sistema de Transcrição Psiquiátrica</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Navigation Menu */}
                <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={navigateToHome}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !showAdminPanel && !showPatientPanel && !showSessionsPanel
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </button>
                  
                  {!isAdmin() && (
                    <button
                      onClick={navigateToPatients}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showPatientPanel
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Pacientes</span>
                    </button>
                  )}
                  
                  <button
                    onClick={navigateToSessions}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      showSessionsPanel
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Sessões</span>
                  </button>
                  
                  {isAdmin() && (
                    <button
                      onClick={navigateToAdmin}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        showAdminPanel
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </button>
                  )}
                </nav>
                
                <UserProfile user={user} onSignOut={signOut} />
              </div>
            </div>
          </div>
        </header>

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