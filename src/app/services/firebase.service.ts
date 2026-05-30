import { Injectable } from '@angular/core';
import { FIREBASE_CONFIG, firebaseEnabled } from './firebase.config';

/**
 * Lazily boots the Firebase modular SDK via dynamic import, so the SDK ends up
 * in its own chunk and is never downloaded while Firebase is disabled.
 * Exposes the Firestore instance plus the firestore namespace (functions).
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private db: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fs: any = null;

  enabled(): boolean {
    return firebaseEnabled();
  }

  private async ensure(): Promise<void> {
    if (this.db) return;
    const appMod = await import('firebase/app');
    const fsMod = await import('firebase/firestore');
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
    this.db = fsMod.getFirestore(app);
    this.fs = fsMod;
  }

  /** Returns the Firestore db handle + the firestore function namespace. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handle(): Promise<{ db: any; fs: any }> {
    await this.ensure();
    return { db: this.db, fs: this.fs };
  }
}
