import { Injectable, signal } from '@angular/core';
import { FIREBASE_CONFIG, firebaseEnabled } from '../services/firebase.config';

const AUTH_KEY  = 'fob-admin-auth';
const PW_KEY    = 'fob-admin-pwhash';
const EMAIL_KEY = 'fob-admin-email';

@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private readonly DEFAULT  = 'fob-admin';
  private readonly firebase = firebaseEnabled();

  /**
   * Авторизован ли пользователь.
   * localStorage: восстанавливается синхронно при старте.
   * Firebase: начинает с false, обновляется через onAuthStateChanged.
   */
  readonly authed = signal<boolean>(this.firebase ? false : this.readLocal());

  /**
   * true пока Firebase асинхронно проверяет сохранённую сессию.
   * Используется чтобы не мигал экран логина при перезагрузке страницы.
   * Для localStorage-режима всегда false (всё синхронно).
   */
  readonly initializing = signal<boolean>(this.firebase);

  constructor() {
    if (this.firebase) {
      void this.restoreFirebaseSession();
    }
  }

  /** Восстанавливает Firebase-сессию из IndexedDB при перезагрузке страницы. */
  private async restoreFirebaseSession(): Promise<void> {
    try {
      const appMod  = await import('firebase/app');
      const authMod = await import('firebase/auth');
      const app  = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);

      // Firebase SDK сам хранит токен в IndexedDB/localStorage.
      // onAuthStateChanged вызывается ОДИН РАЗ при старте с текущим состоянием
      // (user !== null → сессия жива, null → не авторизован).
      authMod.onAuthStateChanged(auth, (user) => {
        this.authed.set(!!user);
        this.initializing.set(false);   // скрываем спиннер
      });
    } catch (e) {
      console.error('[firebase-auth] restore session failed', e);
      this.initializing.set(false);
    }
  }

  /** Сохранённый email для автозаполнения формы входа */
  get savedEmail(): string {
    try { return localStorage.getItem(EMAIL_KEY) ?? ''; } catch { return ''; }
  }

  usesFirebase(): boolean { return this.firebase; }

  // ── localStorage backend ────────────────────────────────────────────
  private readLocal(): boolean {
    try { return localStorage.getItem(AUTH_KEY) === '1'; } catch { return false; }
  }

  private hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  private currentHash(): string {
    try { return localStorage.getItem(PW_KEY) || this.hash(this.DEFAULT); } catch { return this.hash(this.DEFAULT); }
  }

  isDefault(): boolean {
    if (this.firebase) return false;
    try { return !localStorage.getItem(PW_KEY); } catch { return true; }
  }

  async login(pw: string, email = ''): Promise<boolean> {
    if (this.firebase) return this.loginFirebase(email, pw);
    if (this.hash(pw) === this.currentHash()) {
      this.authed.set(true);
      try { localStorage.setItem(AUTH_KEY, '1'); } catch { /* ignore */ }
      return true;
    }
    return false;
  }

  saveEmail(email: string): void {
    try { localStorage.setItem(EMAIL_KEY, email); } catch { /* ignore */ }
  }

  private async loginFirebase(email: string, pw: string): Promise<boolean> {
    try {
      const appMod  = await import('firebase/app');
      const authMod = await import('firebase/auth');
      const app  = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      await authMod.signInWithEmailAndPassword(auth, email.trim(), pw);
      this.saveEmail(email.trim());
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
    try { localStorage.setItem(PW_KEY, this.hash(next)); } catch { return false; }
    return true;
  }

  async logout(): Promise<void> {
    this.authed.set(false);
    try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
    if (this.firebase) {
      try {
        const authMod = await import('firebase/auth');
        await authMod.signOut(authMod.getAuth());
      } catch { /* ignore */ }
    }
  }
}
