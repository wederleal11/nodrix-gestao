import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider, testConnection } from '../lib/firebase';
import {
  getUserProfile,
  upsertUserProfile,
  INITIAL_ADMIN_EMAIL,
  subscribeUsers,
  subscribeCurrentUser,
} from '../services/db';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  activeProfile: UserProfile | null;
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  authError: string | null;
  allUsers: UserProfile[];
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // The Firestore listener must wait for an active profile, not just a Google session.
  useEffect(() => {
    if (!firebaseUser || !profile || profile.status !== 'active') {
      setAllUsers([]);
      return;
    }
    const unsub = subscribeUsers(
      (users) => setAllUsers(users),
      (error) => {
        console.error('Failed to load team list:', error.code);
        setAuthError('Login concluído, mas não foi possível sincronizar a equipe no Firestore.');
      },
    );
    return () => unsub();
  }, [firebaseUser, profile?.uid, profile?.status]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setAuthError(null);
      setProfile(null);
      setFirebaseUser(user);
      if (user) {
        try {
          const email = user.email || '';
          const isInitialAdmin = email.toLowerCase() === INITIAL_ADMIN_EMAIL.toLowerCase();
          const isCorporateOwner = email.toLowerCase() === 'weder.leal@nodrix.com.br' &&
            user.providerData.some((provider) => provider.providerId === 'google.com' && provider.email?.toLowerCase() === email.toLowerCase());

          let userProf = await getUserProfile(user.uid);

          if (!userProf) {
            // Check if there was a pre-seeded member with this email
            const matchedPreseeded = allUsers.find(
              (u) => u.email.toLowerCase() === email.toLowerCase()
            );

            userProf = {
              uid: user.uid,
              name: user.displayName || (isInitialAdmin ? 'Weder Leal' : email.split('@')[0]),
              email,
              role: (isInitialAdmin || isCorporateOwner) ? 'admin' : 'collaborator',
              isSuperAdmin: isInitialAdmin || isCorporateOwner,
              title: isInitialAdmin ? 'Super Admin & Gestor' : (matchedPreseeded?.title || 'Desenvolvedor'),
              availability: matchedPreseeded?.availability || '40h semanais',
              avatarUrl: user.photoURL || '',
              status: (isInitialAdmin || isCorporateOwner) ? 'active' : (matchedPreseeded?.status || 'pending'),
              createdAt: new Date().toISOString(),
            };
            await upsertUserProfile(userProf);
          } else if ((isInitialAdmin || isCorporateOwner) && (!userProf.isSuperAdmin || userProf.role !== 'admin')) {
            // Firestore rules must be deployed separately from the Vercel frontend.
            const promoted = { ...userProf, role: 'admin' as const, isSuperAdmin: true, status: 'active' as const };
            try {
              await upsertUserProfile(promoted);
              userProf = promoted;
            } catch (error) {
              console.warn('Owner access requires the matching deployed Firestore rules.', error);
              setAuthError('A conta proprietária foi reconhecida, mas o Firestore ainda precisa receber as regras de autorização.');
            }
          }

          // Refresh a real signed-in user's Google portrait without modifying
          // the historical task assignment or impersonating another profile.
          if (user.photoURL && userProf.avatarUrl !== user.photoURL) {
            const updatedWithAvatar = { ...userProf, avatarUrl: user.photoURL };
            try {
              await upsertUserProfile(updatedWithAvatar);
              userProf = updatedWithAvatar;
            } catch {
              // Photo sync is optional and must not block login.
            }
          }
          setProfile(userProf);
          setActiveUserId(userProf.uid);

          // Initial sample data are managed explicitly in Settings.
          // Auto-seeding at every sign-in resurrects intentionally removed users/projects.
        } catch (e) {
          console.error('Error loading user profile:', e);
          setProfile(null);
          setActiveUserId('');
          setAuthError('O Google confirmou sua conta, mas o Nodrix não conseguiu carregar seu cadastro no Firestore. Verifique as permissões do banco e se o seu usuário está autorizado.');
        }
      } else {
        setProfile(null);
        setActiveUserId('');
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase auth state error:', error);
      setAuthError('Não foi possível verificar a sessão com o Firebase. Recarregue a página e tente novamente.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Session roles and disabled status must react to changes made by another admin.
  useEffect(() => {
    if (!firebaseUser || !profile || firebaseUser.uid !== profile.uid) return;
    return subscribeCurrentUser(firebaseUser.uid, (latest) => {
      if (latest) setProfile(latest);
      else setProfile(null);
    }, (error) => {
      console.error('Current user permission synchronization failed:', error.code);
      setAuthError('Não foi possível sincronizar as permissões da sua conta.');
    });
  }, [firebaseUser?.uid, profile?.uid]);

  const activeProfile = useMemo(() => {
    if (!activeUserId) return profile;
    if (profile && profile.uid === activeUserId) return profile;
    return allUsers.find((u) => u.uid === activeUserId) || profile;
  }, [activeUserId, profile, allUsers]);

  const isSuperAdmin = useMemo(() => {
    // Perspective selection changes dashboards, never the signed-in user's permissions.
    if (!profile) return false;
    const signedInEmail = firebaseUser?.email?.toLowerCase();
    const verifiedGoogle = firebaseUser?.providerData.some(
      (provider) => provider.providerId === 'google.com' && provider.email?.toLowerCase() === signedInEmail
    );
    return profile.status === 'active' && Boolean(verifiedGoogle) && (
      signedInEmail === INITIAL_ADMIN_EMAIL.toLowerCase() ||
      signedInEmail === 'weder.leal@nodrix.com.br'
    );
  }, [profile, firebaseUser]);

  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.status === 'active' && (profile.role === 'admin' || isSuperAdmin);
  }, [profile, isSuperAdmin]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setProfile(null);
    setActiveUserId('');
  };

  const updateProfileDetails = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    await upsertUserProfile(updated);
    setProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        activeProfile,
        activeUserId,
        setActiveUserId,
        isAdmin,
        isSuperAdmin,
        loading,
        authError,
        allUsers,
        signInWithGoogle,
        signOut,
        updateProfileDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
