'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (phone: string, name?: string) => Promise<boolean>;
  signup: (profileData: Omit<UserProfile, 'id'>) => Promise<boolean>;
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

// Default sample demo user (Juan Dela Cruz) with realistic far delivery address (~4.2 km away)
const DEFAULT_USER: UserProfile = {
  id: 'usr_default_1',
  name: 'Juan Dela Cruz',
  phone: '0917-882-4242',
  email: 'juan.delacruz@gmail.com',
  address: '142 Mindanao Avenue, Barangay Bahay Toro, Project 8, Quezon City',
  landmark: 'Near 7-Eleven, Green Gate',
  latitude: 14.6585,
  longitude: 121.0252,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('regasco_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // By default initialize with the default profile so address is always ready
        setUser(DEFAULT_USER);
        localStorage.setItem('regasco_user', JSON.stringify(DEFAULT_USER));
      }
    } catch (e) {
      setUser(DEFAULT_USER);
    }
    setIsInitialized(true);
  }, []);

  const login = async (phone: string, name?: string) => {
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name || user?.name || 'Customer',
      phone: phone.trim(),
      address: user?.address || '142 Mindanao Avenue, Barangay Bahay Toro, Project 8, Quezon City',
      landmark: user?.landmark || '',
      latitude: user?.latitude || 14.6585,
      longitude: user?.longitude || 121.0252,
    };
    setUser(newUser);
    localStorage.setItem('regasco_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);
    return true;
  };

  const signup = async (profileData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...profileData,
      id: `usr_${Date.now()}`,
    };
    setUser(newUser);
    localStorage.setItem('regasco_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);
    return true;
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
