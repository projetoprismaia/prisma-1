import React from 'react';
import { User, LogOut, Shield } from 'lucide-react';
import { AuthUser } from '../types/user';

interface UserProfileProps {
  user: AuthUser;
  onSignOut: () => void;
}

export default function UserProfile({ user, onSignOut }: UserProfileProps) {
  const isAdmin = user.profile.role === 'admin';

  return (
    <div className="flex items-center space-x-3">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        isAdmin ? 'bg-purple-50' : 'bg-blue-50'
      }`}>
        {isAdmin ? (
          <Shield className="h-4 w-4 text-purple-600" />
        ) : (
          <User className="h-4 w-4 text-blue-600" />
        )}
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${
            isAdmin ? 'text-purple-800' : 'text-blue-800'
          }`}>
            {user.email}
          </span>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-red-50"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm">Sair</span>
      </button>
    </div>
  );
}