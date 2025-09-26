export type UserRole = 'operator' | 'business_owner';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateUserProfileData {
  email: string;
  displayName: string;
  role: UserRole;
}