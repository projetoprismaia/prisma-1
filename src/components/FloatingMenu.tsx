import React from 'react';
import { BarChart3, Users, FileText, Settings, User, LogOut } from 'lucide-react';
import { AuthUser } from '../types/user';

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
  return (
    <div className="floating-menu">
      <div className="menu-items">
        <button
          onClick={onNavigateToHome}
          className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          DASHBOARD
        </button>
        
        {!isAdmin && (
          <button
            onClick={onNavigateToPatients}
            className={`menu-item ${activeSection === 'patients' ? 'active' : ''}`}
          >
            <Users className="h-4 w-4 mr-2" />
            PACIENTES
          </button>
        )}
        
        <button
          onClick={onNavigateToSessions}
          className={`menu-item ${activeSection === 'sessions' ? 'active' : ''}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          SESSÕES
        </button>
        
        {isAdmin && (
          <button
            onClick={onNavigateToAdmin}
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
          onClick={onSignOut}
          className="menu-item logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          SAIR
        </button>
      </div>
    </div>
  );
}