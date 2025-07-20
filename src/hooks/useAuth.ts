import React, { useState, useEffect } from 'react';
import FirebaseAuthService, { AuthUser } from '../services/firebaseAuthService';
import { ProfileService, UserProfileData } from '../services/profileService';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthChange = async (authUser: AuthUser | null) => {
      setUser(authUser);
      if (authUser) {
        try {
          const profile = await ProfileService.getOrCreateProfile(
            authUser.uid,
            authUser.email || '',
            authUser.displayName || ''
          );
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to get or create user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    };

    const unsubscribe = FirebaseAuthService.onAuthStateChange(handleAuthChange);

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user
  };
};
