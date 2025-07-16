import React from 'react';
import { User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfileProps {
  user: any;
  onSignOut: () => void;
}

export default function UserProfile({ user, onSignOut }: UserProfileProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
        <User className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800 font-medium">
          {user.email}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-red-50"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm">Sair</span>
      </button>
    </div>
  );
}