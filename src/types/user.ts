export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  whatsapp?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile;
}