'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (phone: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (profileData: Omit<UserProfile, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (
    address: string,
    landmark?: string,
    latitude?: number,
    longitude?: number
  ) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user from localStorage on mount (Guest by default, no fake auto-login)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('regasco_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Purge legacy fake Juan Dela Cruz default session if present
        if (parsed?.id === 'usr_default_1' || parsed?.phone === '0917-882-4242') {
          localStorage.removeItem('regasco_user');
          setUser(null);
        } else if (parsed && parsed.phone) {
          setUser(parsed);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
    setIsInitialized(true);
  }, []);

  const login = async (phone: string, password?: string) => {
    const cleanInputPhone = phone.trim().replace(/[\s-]/g, '');

    if (!cleanInputPhone) {
      return { success: false, error: 'Please enter your mobile phone number.' };
    }

    // Check registered accounts
    let registeredUsers: UserProfile[] = [];
    try {
      const raw = localStorage.getItem('regasco_registered_users');
      if (raw) registeredUsers = JSON.parse(raw);
    } catch (e) {}

    const found = registeredUsers.find(
      (u) => (u.phone || '').replace(/[\s-]/g, '') === cleanInputPhone
    );

    if (!found) {
      return {
        success: false,
        error: 'No account found with this phone number. Please click "Create Account" first.',
      };
    }

    if (found.password && password && found.password !== password.trim()) {
      return {
        success: false,
        error: 'Incorrect password. Please verify and try again.',
      };
    }

    setUser(found);
    localStorage.setItem('regasco_user', JSON.stringify(found));
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const signup = async (profileData: Omit<UserProfile, 'id'>) => {
    const cleanPhone = profileData.phone.trim().replace(/[\s-]/g, '');

    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid mobile phone number.' };
    }

    let registeredUsers: UserProfile[] = [];
    try {
      const raw = localStorage.getItem('regasco_registered_users');
      if (raw) registeredUsers = JSON.parse(raw);
    } catch (e) {}

    const existing = registeredUsers.find(
      (u) => (u.phone || '').replace(/[\s-]/g, '') === cleanPhone
    );

    if (existing) {
      return {
        success: false,
        error: 'An account with this phone number already exists. Please Sign In instead.',
      };
    }

    const newUser: UserProfile = {
      ...profileData,
      id: `usr_${Date.now()}`,
      phone: profileData.phone.trim(),
      password: profileData.password?.trim(),
    };

    registeredUsers.push(newUser);
    localStorage.setItem('regasco_registered_users', JSON.stringify(registeredUsers));
    localStorage.setItem('regasco_user', JSON.stringify(newUser));
    setUser(newUser);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const updateAddress = (
    address: string,
    landmark?: string,
    latitude?: number,
    longitude?: number
  ) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      address,
      landmark: landmark !== undefined ? landmark : user.landmark,
      latitude: latitude !== undefined ? latitude : user.latitude,
      longitude: longitude !== undefined ? longitude : user.longitude,
    };
    setUser(updated);
    localStorage.setItem('regasco_user', JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('regasco_user');
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        updateAddress,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
