import { useState, useEffect, useMemo } from 'react';
import { AuthService, AuthUser } from '../services/authService';
import { FirebaseProfileService, Profile } from '../services/firebaseProfileService';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // ✅ Make sure the auth provider (Firebase) is ready
        await AuthService.initializeProvider();

        // Get initial user
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

        // Listen for auth state changes AFTER provider is initialized
        unsubscribe = AuthService.onAuthStateChange(async (user) => {
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
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return useMemo(() => ({
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    needsEmailVerification: user ? !user.emailVerified : false
  }), [user, userProfile, loading]);
};