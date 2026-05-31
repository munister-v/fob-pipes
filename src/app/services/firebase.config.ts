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
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

/** True only when a real project id + apiKey are filled in above. */
export function firebaseEnabled(): boolean {
  return !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
}
