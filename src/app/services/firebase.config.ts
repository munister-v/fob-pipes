/**
 * Firebase configuration.
 *
 * ── HOW TO ACTIVATE (≈3 минуты) ──────────────────────────────────────
 * 1. https://console.firebase.google.com → «Создать проект» (например fob-pipes).
 * 2. В проекте: Build → Firestore Database → «Создать базу» → режим Production,
 *    регион europe-west.
 * 3. Project settings (⚙) → «Your apps» → значок </> (Web) → зарегистрировать.
 *    Скопировать объект firebaseConfig и вставить значения ниже.
 * 4. Firestore → Rules → вставить содержимое firestore.rules (в корне репо) → Publish.
 * 5. Пересобрать и задеплоить. Всё — заявки и каталог станут глобальными.
 *
 * Пока поля пустые — сайт работает на localStorage (как сейчас), ничего не ломается.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBBYCymKAlo8GVKKPBlnTt_dfidBS42JSk',
  authDomain: 'fob-pipes.firebaseapp.com',
  projectId: 'fob-pipes',
  storageBucket: 'fob-pipes.firebasestorage.app',
  messagingSenderId: '498531195499',
  appId: '1:498531195499:web:a01a6455dea745fa7eaf2e',
};

/** True only when a real project id + apiKey are filled in above. */
export function firebaseEnabled(): boolean {
  return !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
}
