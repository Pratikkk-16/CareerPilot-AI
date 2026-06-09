"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { auth, googleProvider, isFirebaseMock } from "@/lib/firebase";

interface UserType {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  isMock: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(isFirebaseMock);

  useEffect(() => {
    // If we override mock due to init failures
    if ((globalThis as any).isFirebaseMockOverride) {
      setIsMock(true);
    }

    if (isMock) {
      // Load mock user from localStorage if it exists
      const savedUser = localStorage.getItem("mock_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
      return;
    }

    // Real Firebase listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isMock]);

  const triggerMockLogin = async () => {
    // Simulate Google Sign-In with popup delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUser: UserType = {
      uid: "mock_user_12345",
      displayName: "Jane Doe (Demo)",
      email: "jane.doe@example.com",
      photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jane",
    };
    setUser(mockUser);
    localStorage.setItem("mock_user", JSON.stringify(mockUser));
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    if (isMock) {
      await triggerMockLogin();
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      
      // Check if it's a configuration error or placeholder error
      const isConfigError = 
        error.code === "auth/configuration-not-found" || 
        error.code === "auth/api-key-not-valid" || 
        error.code === "auth/invalid-api-key" ||
        error.message?.includes("API key") ||
        error.message?.includes("configuration");

      if (isConfigError) {
        console.warn("Detected Firebase Auth config issue. Automatically falling back to Demo/Mock Mode...");
        setIsMock(true);
        // Set the global override so that subsequent DB requests also use mock mode
        (globalThis as any).isFirebaseMockOverride = true;
        await triggerMockLogin();
        return;
      }
      
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isMock) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUser(null);
      localStorage.removeItem("mock_user");
      setLoading(false);
      return;
    }

    try {
      await fbSignOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isMock, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
