import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, CreateUserProfileData, UserRole } from '@/types/user';

const USERS_COLLECTION = 'user_profiles';

export class UserService {
  static async createUserProfile(userId: string, data: CreateUserProfileData): Promise<UserProfile> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    const userProfile: Omit<UserProfile, 'id'> = {
      userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    await setDoc(userRef, {
      ...userProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: userId, ...userProfile };
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    return {
      id: userSnap.id,
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role as UserRole,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isActive: data.isActive ?? true,
    };
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  static async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role as UserRole,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isActive: data.isActive ?? true,
      };
    });
  }

  static subscribeToUserProfile(
    userId: string, 
    callback: (profile: UserProfile | null) => void
  ): Unsubscribe {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    return onSnapshot(userRef, (doc) => {
      if (!doc.exists()) {
        callback(null);
        return;
      }

      const data = doc.data();
      const profile: UserProfile = {
        id: doc.id,
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role as UserRole,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isActive: data.isActive ?? true,
      };
      
      callback(profile);
    });
  }
}