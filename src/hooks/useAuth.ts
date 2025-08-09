import { useState, useEffect, useMemo } from 'react';
import { AuthService, AuthUser } from '../services/authService';
import { FirebaseProfileService, Profile } from '../services/firebaseProfileService';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    const initializeAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          try {
            const profile = await FirebaseProfileService.getOrCreateProfile(
              currentUser.id, 
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
    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const profile = await FirebaseProfileService.getOrCreateProfile(
            user.id, 
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