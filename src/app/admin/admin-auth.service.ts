import { Injectable, signal } from '@angular/core';
import { FIREBASE_CONFIG, firebaseEnabled } from '../services/firebase.config';

/**
 * Admin gate.
 *
 * When Firebase is configured it uses Firebase Auth Email/Password, so
 * Firestore rules receive a real request.auth. Otherwise it falls back to the
 * local demo password for zero-setup editing.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private readonly KEY = 'fob-admin-auth';
  private readonly PW_KEY = 'fob-admin-pwhash';
  /** Default password, used until the admin sets a custom one. */
  private readonly DEFAULT = 'fob-admin';
  private readonly firebase = firebaseEnabled();

  readonly authed = signal<boolean>(this.firebase ? false : this.read());

  usesFirebase(): boolean {
    return this.firebase;
  }

  private read(): boolean {
    try {
      return sessionStorage.getItem(this.KEY) === '1';
    } catch {
      return false;
    }
  }

  /** djb2 — good enough to avoid storing the literal password in the clear. */
  private hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  private currentHash(): string {
    try {
      return localStorage.getItem(this.PW_KEY) || this.hash(this.DEFAULT);
    } catch {
      return this.hash(this.DEFAULT);
    }
  }

  /** True while the default password is still in use (nudge to change it). */
  isDefault(): boolean {
    if (this.firebase) return false;
    try {
      return !localStorage.getItem(this.PW_KEY);
    } catch {
      return true;
    }
  }

  async login(pw: string, email = ''): Promise<boolean> {
    if (this.firebase) return this.loginFirebase(email, pw);
    if (this.hash(pw) === this.currentHash()) {
      this.authed.set(true);
      try {
        sessionStorage.setItem(this.KEY, '1');
      } catch {
        /* ignore */
      }
      return true;
    }
    return false;
  }

  private async loginFirebase(email: string, pw: string): Promise<boolean> {
    try {
      const appMod = await import('firebase/app');
      const authMod = await import('firebase/auth');
      const app = appMod.getApps().length
        ? appMod.getApp()
        : appMod.initializeApp(FIREBASE_CONFIG);
      await authMod.signInWithEmailAndPassword(authMod.getAuth(app), email.trim(), pw);
      this.authed.set(true);
      return true;
    } catch (e) {
      console.error('[firebase-auth] login failed', e);
      this.authed.set(false);
      return false;
    }
  }

  changePassword(current: string, next: string): boolean {
    if (this.firebase) return false;
    if (this.hash(current) !== this.currentHash()) return false;
    if (next.length < 4) return false;
    try {
      localStorage.setItem(this.PW_KEY, this.hash(next));
    } catch {
      return false;
    }
    return true;
  }

  async logout(): Promise<void> {
    this.authed.set(false);
    if (this.firebase) {
      try {
        const authMod = await import('firebase/auth');
        await authMod.signOut(authMod.getAuth());
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      sessionStorage.removeItem(this.KEY);
    } catch {
      /* ignore */
    }
  }
}
