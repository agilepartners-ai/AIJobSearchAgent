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
        console.log('Initializing auth...');
        const currentUser = await SupabaseAuthService.getCurrentUser();
        console.log('Current user from auth service:', currentUser);
        setUser(currentUser);
        
        if (currentUser) {
          try {
            console.log('Fetching profile for user:', currentUser.uid);
            const profile = await SupabaseProfileService.getOrCreateProfile(
              currentUser.uid, 
              currentUser.email || '', 
              currentUser.displayName || ''
            );
            console.log('Profile loaded:', profile);
            setUserProfile(profile);
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = SupabaseAuthService.onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user);
      setUser(user);
      
      if (user) {
        try {
          console.log('Fetching profile after auth change for user:', user.uid);
          const profile = await SupabaseProfileService.getOrCreateProfile(
            user.uid, 
            user.email || '', 
            user.displayName || ''
          );
          console.log('Profile after auth change:', profile);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile after auth change:', error);
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