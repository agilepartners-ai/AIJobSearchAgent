import { useState, useEffect, useMemo } from 'react';
import FirebaseAuthService, { AuthUser } from '../services/firebaseAuthService';
import { ProfileService, Profile } from '../services/ProfileService';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    const initializeAuth = async () => {
      try {
        const currentUser = await FirebaseAuthService.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          try {
            const profile = await ProfileService.getOrCreateProfile(
              currentUser.uid, 
              currentUser.email || '', 
              currentUser.displayName || ''
            );
            setUserProfile(profile);
          } catch (error) {
            console.error("Failed to get or create user profile:", error);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const profile = await ProfileService.getOrCreateProfile(
            user.uid, 
            user.email || '', 
            user.displayName || ''
          );
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to update user profile on auth change:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return useMemo(() => ({
    user,
    userProfile,
    loading,
    isAuthenticated: !!user
  }), [user, userProfile, loading]);
};