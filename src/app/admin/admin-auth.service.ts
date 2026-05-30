import { Injectable, signal } from '@angular/core';

/**
 * Minimal admin gate. Demo-grade: a shared password kept client-side.
 * Swap for Firebase Auth (email/password or Google) when the backend is on —
 * the `authed` signal API stays the same for consumers.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private readonly KEY = 'fob-admin-auth';
  /** TODO: replace with Firebase Auth. Change before going public. */
  private readonly PASSWORD = 'fob-admin';

  readonly authed = signal<boolean>(this.read());

  private read(): boolean {
    try {
      return sessionStorage.getItem(this.KEY) === '1';
    } catch {
      return false;
    }
  }

  login(pw: string): boolean {
    if (pw === this.PASSWORD) {
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

  logout(): void {
    this.authed.set(false);
    try {
      sessionStorage.removeItem(this.KEY);
    } catch {
      /* ignore */
    }
  }
}
