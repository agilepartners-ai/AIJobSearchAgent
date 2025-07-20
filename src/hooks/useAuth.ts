import { useState, useEffect } from 'react';
import SupabaseAuthService, { AuthUser } from '../services/supabaseAuthService';
import { SupabaseProfileService } from '../services/profileService';
import { Profile } from '../types/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    const initializeAuth = async () => {
      try {
        const currentUser = await SupabaseAuthService.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          try {
            const profile = await SupabaseProfileService.getOrCreateProfile(
              currentUser.uid, 
              currentUser.email || '', 
              currentUser.displayName || ''
            );
            setUserProfile(profile);
          } catch (error) {
            // Handle error silently
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = SupabaseAuthService.onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const profile = await SupabaseProfileService.getOrCreateProfile(
            user.uid, 
            user.email || '', 
            user.displayName || ''
          );
          setUserProfile(profile);
        } catch (error) {
          // Handle error silently
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user
  };
};