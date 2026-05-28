import { defineStore } from 'pinia';
import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { useAppStore } from '@/stores/app';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  system_role: 'ADMIN' | 'CEO' | 'LEADER' | 'STAFF';
  department_id?: string;
  is_active: boolean;
  photo_url?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserProfile | null,
    loading: true,
    initialized: false,
    googleAccessToken: null as string | null
  }),
  getters: {
    isAdmin: (state) => state.user?.system_role === 'ADMIN' || state.user?.system_role === 'CEO',
    isStaff: (state) => state.user?.system_role === 'STAFF' || state.user?.system_role === 'LEADER',
    canManageSystem: (state) => state.user?.system_role === 'ADMIN' || state.user?.system_role === 'CEO',
    hasGoogleCalendar: (state) => !!state.googleAccessToken
  },
  actions: {
    async init() {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          const oldUser = this.user;
          if (firebaseUser) {
            try {
              const userDoc = await getDoc(doc(db, 'employees', firebaseUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                if (!userData.is_active) {
                  await signOut(auth);
                  this.user = null;
                  this.loading = false;
                  this.initialized = true;
                  alert('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.');
                  resolve(null);
                  return;
                }
                this.user = { id: userDoc.id, ...userData } as UserProfile;
              } else {
                // Auto-create on first login
                const newUser: UserProfile = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'User',
                  email: firebaseUser.email || '',
                  system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
                  is_active: true,
                  photo_url: firebaseUser.photoURL || ''
                };
                try {
                  await setDoc(doc(db, 'employees', firebaseUser.uid), newUser);
                } catch (writeErr) {
                  console.warn('Failed to auto-create user database document (offline):', writeErr);
                }
                this.user = newUser;
              }
              
              // If user logged in or changed, refresh data
              if (!oldUser || oldUser.id !== this.user.id) {
                const appStore = useAppStore();
                if (oldUser) await appStore.clearMemory();
                await appStore.refreshAll();
              }
            } catch (err: any) {
              console.error('Error fetching employee user document inside auth onAuthStateChanged:', err);
              // Safe fallback for offline testing
              this.user = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'User Offline',
                email: firebaseUser.email || '',
                system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
                is_active: true,
                photo_url: firebaseUser.photoURL || ''
              };
            }
          } else {
            this.user = null;
          }
          this.loading = false;
          this.initialized = true;
          resolve(this.user);
        });
      });
    },
    async login() {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (firebaseUser) {
        this.loading = true;
        try {
          const userDoc = await getDoc(doc(db, 'employees', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (userData.is_active) {
              this.user = { id: userDoc.id, ...userData } as UserProfile;
            } else {
              await signOut(auth);
              this.user = null;
              throw new Error('Tài khoản của bạn đã bị khóa.');
            }
          } else {
            const newUser: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
              is_active: true,
              photo_url: firebaseUser.photoURL || ''
            };
            await setDoc(doc(db, 'employees', firebaseUser.uid), newUser);
            this.user = newUser;
          }
        } catch (err: any) {
          console.error('Error loading or creating user during login process:', err);
          this.user = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User Offline',
            email: firebaseUser.email || '',
            system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
            is_active: true,
            photo_url: firebaseUser.photoURL || ''
          };
        }
        this.loading = false;
        this.initialized = true;
        
        // Refresh app data after login
        const appStore = useAppStore();
        await appStore.refreshAll();
      }
      
      return firebaseUser;
    },
    async loginWithGoogleCalendar() {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Không lấy được tài khoản hoặc Google Access Token.');
      }
      this.googleAccessToken = credential.accessToken;
      
      const firebaseUser = result.user;
      if (firebaseUser) {
        this.loading = true;
        try {
          const userDoc = await getDoc(doc(db, 'employees', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (userData.is_active) {
              this.user = { id: userDoc.id, ...userData } as UserProfile;
            } else {
              await signOut(auth);
              this.user = null;
              throw new Error('Tài khoản của bạn đã bị khóa.');
            }
          } else {
            const newUser: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
              is_active: true,
              photo_url: firebaseUser.photoURL || ''
            };
            try {
              await setDoc(doc(db, 'employees', firebaseUser.uid), newUser);
            } catch (writeErr) {
              console.warn('Failed to auto-create user database document during calendar auth (offline):', writeErr);
            }
            this.user = newUser;
          }
        } catch (err: any) {
          console.error('Error loading or creating user during calendar login process:', err);
          this.user = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User Offline',
            email: firebaseUser.email || '',
            system_role: (firebaseUser.email === 'dang.nh.aprotrain@gmail.com') ? 'ADMIN' : 'STAFF',
            is_active: true,
            photo_url: firebaseUser.photoURL || ''
          };
        }
        this.loading = false;
        this.initialized = true;
        
        // Refresh app data after login
        const appStore = useAppStore();
        await appStore.refreshAll();
      }
      return this.googleAccessToken;
    },
    async logout() {
      await signOut(auth);
      this.user = null;
      this.googleAccessToken = null;
      const appStore = useAppStore();
      await appStore.clearMemory();
    }
  }
});
