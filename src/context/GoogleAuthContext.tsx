import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
} from '../services/googleAuth';

interface GoogleAuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  driveModalOpen: boolean;
  setDriveModalOpen: (open: boolean) => void;
  slidesModalOpen: boolean;
  setSlidesModalOpen: (open: boolean) => void;
  formsModalOpen: boolean;
  setFormsModalOpen: (open: boolean) => void;
  gmailModalOpen: boolean;
  setGmailModalOpen: (open: boolean) => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const GoogleAuthProviderComponent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [driveModalOpen, setDriveModalOpen] = useState<boolean>(false);
  const [slidesModalOpen, setSlidesModalOpen] = useState<boolean>(false);
  const [formsModalOpen, setFormsModalOpen] = useState<boolean>(false);
  const [gmailModalOpen, setGmailModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setAccessToken(token);
        }
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const res = await googleSignIn();
      setUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err) {
      console.error('Sign in failed:', err);
      throw err;
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isSigningIn,
        signIn: handleSignIn,
        signOut: handleSignOut,
        driveModalOpen,
        setDriveModalOpen,
        slidesModalOpen,
        setSlidesModalOpen,
        formsModalOpen,
        setFormsModalOpen,
        gmailModalOpen,
        setGmailModalOpen,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = (): GoogleAuthContextType => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProviderComponent');
  }
  return context;
};
