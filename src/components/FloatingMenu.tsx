import React from 'react';
import { BarChart3, Users, FileText, Settings, User, LogOut } from 'lucide-react';
import { AuthUser } from '../types/user';
import { logger } from '../utils/logger';

interface FloatingMenuProps {
  currentUser: AuthUser;
  activeSection: 'dashboard' | 'patients' | 'sessions' | 'admin';
  onNavigateToHome: () => void;
  onNavigateToPatients: () => void;
  onNavigateToSessions: () => void;
  onNavigateToAdmin: () => void;
  onSignOut: () => void;
  isAdmin: boolean;
}

export default function FloatingMenu({
  currentUser,
  activeSection,
  onNavigateToHome,
  onNavigateToPatients,
  onNavigateToSessions,
  onNavigateToAdmin,
  onSignOut,
  isAdmin
}: FloatingMenuProps) {
  // Log quando o menu é renderizado
  React.useEffect(() => {
    logger.debug('UI', 'FloatingMenu renderizado', {
      activeSection,
      isAdmin,
      userId: currentUser.id
    });
  }, [activeSection, isAdmin, currentUser.id]);

  return (
    <div className="floating-menu">
      <div className="menu-items">
        <button
          onClick={() => {
            logger.uiEvent('FloatingMenu', 'Dashboard clicked', {
              currentSection: activeSection,
              userId: currentUser.id,
              isAdmin
            });
            onNavigateToHome();
          }}
          className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          DASHBOARD
        </button>
        
        {!isAdmin && (
          <button
            onClick={() => {
              logger.uiEvent('FloatingMenu', 'Pacientes clicked', {
                currentSection: activeSection,
                userId: currentUser.id,
                isAdmin
              });
              onNavigateToPatients();
            }}
            className={`menu-item ${activeSection === 'patients' ? 'active' : ''}`}
          >
            <Users className="h-4 w-4 mr-2" />
            PACIENTES
          </button>
        )}
        
        <button
          onClick={() => {
            logger.uiEvent('FloatingMenu', 'Sessões clicked', {
              currentSection: activeSection,
              userId: currentUser.id
            });
            onNavigateToSessions();
          }}
          className={`menu-item ${activeSection === 'sessions' ? 'active' : ''}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          SESSÕES
        </button>
        
        {isAdmin && (
          <button
            onClick={() => {
              logger.uiEvent('FloatingMenu', 'Admin clicked', {
                currentSection: activeSection,
                userId: currentUser.id,
                isAdmin
              });
              onNavigateToAdmin();
            }}
            className={`menu-item ${activeSection === 'admin' ? 'active' : ''}`}
          >
            <Settings className="h-4 w-4 mr-2" />
            ADMIN
          </button>
        )}
        
        <div className="menu-separator"></div>
        
        <span className="menu-item user-name">
          <User className="h-4 w-4 mr-2" />
          {currentUser.profile.full_name || currentUser.email.split('@')[0]}
        </span>
        
        <button
          onClick={() => {
            logger.uiEvent('FloatingMenu', 'Sair clicked', {
              userId: currentUser.id,
              timestamp: new Date().toISOString()
            });
            onSignOut();
          }}
          className="menu-item logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          SAIR
        </button>
      </div>
    </div>
  );
}