import { Injectable, signal } from '@angular/core';

/**
 * Minimal admin gate. Demo-grade: a password kept client-side (hashed in
 * localStorage once changed). Swap for Firebase Auth when the backend is on —
 * the `authed` signal API stays the same for consumers.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private readonly KEY = 'fob-admin-auth';
  private readonly PW_KEY = 'fob-admin-pwhash';
  /** Default password, used until the admin sets a custom one. */
  private readonly DEFAULT = 'fob-admin';

  readonly authed = signal<boolean>(this.read());

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
    try {
      return !localStorage.getItem(this.PW_KEY);
    } catch {
      return true;
    }
  }

  login(pw: string): boolean {
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

  changePassword(current: string, next: string): boolean {
    if (this.hash(current) !== this.currentHash()) return false;
    if (next.length < 4) return false;
    try {
      localStorage.setItem(this.PW_KEY, this.hash(next));
    } catch {
      return false;
    }
    return true;
  }

  logout(): void {
    this.authed.set(false);
    try {
      sessionStorage.removeItem(this.KEY);
    } catch {
      /* ignore */
    }
  }
}
