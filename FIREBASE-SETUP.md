# Подключение Firebase (≈3 минуты)

Пока конфиг пустой — сайт работает на `localStorage` (данные в браузере).
Заполнив конфиг, вы делаете каталог и заявки **глобальными и realtime**:
заявки клиентов приходят с любого устройства, правки каталога видят все.

## Шаги

1. **Создать проект**
   https://console.firebase.google.com → «Добавить проект» → имя `fob-pipes`
   (Google Analytics можно выключить).

2. **Включить Firestore**
   Слева **Build → Firestore Database → Создать базу данных**
   → режим **Production** → регион `eur3 (europe-west)` → Готово.

3. **Зарегистрировать веб-приложение**
   ⚙ **Project settings** → блок **Your apps** → иконка `</>` (Web)
   → ник `fob` → Register app.
   Появится объект `firebaseConfig` — скопируйте значения.

4. **Вставить конфиг**
   Откройте `src/app/services/firebase.config.ts` и впишите значения в
   `FIREBASE_CONFIG` (apiKey, authDomain, projectId, storageBucket,
   messagingSenderId, appId).

5. **Опубликовать правила**
   Firestore → вкладка **Rules** → вставьте содержимое `firestore.rules`
   (в корне репозитория) → **Publish**.

6. **Пересобрать и задеплоить**
   ```
   npm run build -- --base-href=/fob/
   # скопировать dist/donpipe-front/browser → fob/ в munister-v.github.io, запушить
   ```

Готово. При первом запуске каталог автоматически «засеется» текущими позициями.

## Безопасность админки

Правила выше требуют Firebase Auth и allowlist администратора для записи в каталог и чтения заявок.
Админка уже умеет входить через Firebase Auth, когда заполнен `firebase.config.ts`.
Сейчас админ:

```
tilandiya@gmail.com
```

Если нужно заменить админа:

1. Firebase → **Authentication → Sign-in method → Email/Password → Enable**.
2. **Users → Add user** — создайте новый аккаунт админа.
3. Обновите email в `firestore.rules` внутри функции `isAdmin()`.
4. Выполните `firebase deploy --only firestore:rules`.

До этого для теста можно временно поставить «QUICK DEMO» правила из низа
`firestore.rules` (открытый доступ), но не оставлять их на проде.
