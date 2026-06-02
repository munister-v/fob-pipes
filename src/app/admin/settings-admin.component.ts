import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../services/data-store.service';
import { AdminAuth } from './admin-auth.service';
import { ToastService } from './toast.service';
import { TelegramService } from '../services/telegram.service';

const TG_TOKEN_KEY  = 'fob-tg-token';
const TG_CHAT_KEY   = 'fob-tg-chat';

@Component({
  selector: 'app-settings-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Настройки</h1>
        <p class="adm-sub">Хранилище, Telegram, резервные копии и доступ</p>
      </div>
    </header>

    <div class="adm-grid-cols">
      <!-- Backend status -->
      <section class="adm-card">
        <div class="adm-card__head"><h2>Хранилище данных</h2></div>
        <div class="adm-kv">
          <span>Режим</span>
          <b>
            <span class="adm-dot" [class.adm-dot--ok]="store.backend() === 'firebase'"></span>
            {{ store.backend() === 'firebase' ? 'Firebase (облако, realtime)' : 'localStorage (этот браузер)' }}
          </b>
        </div>
        <p class="adm-note" *ngIf="store.backend() === 'local'">
          Данные хранятся только в этом браузере. Чтобы заявки и каталог были общими
          для всех устройств в реальном времени — заполните <code>firebase.config.ts</code>.
        </p>
        <p class="adm-note" *ngIf="store.backend() === 'firebase'">
          Firebase подключён: правки каталога и входящие заявки синхронизируются между всеми устройствами.
        </p>
      </section>

      <!-- Access -->
      <section class="adm-card">
        <div class="adm-card__head"><h2>Пароль доступа</h2></div>
        <ng-container *ngIf="!auth.usesFirebase(); else firebaseAccess">
          <p class="adm-warn" *ngIf="auth.isDefault()">⚠ Используется пароль по умолчанию — смените его.</p>
          <label class="adm-field"><span>Текущий пароль</span>
            <input type="password" [(ngModel)]="pwCur" name="pwc" autocomplete="current-password" /></label>
          <div class="adm-grid2">
            <label class="adm-field"><span>Новый пароль</span>
              <input type="password" [(ngModel)]="pwNew" name="pwn" autocomplete="new-password" /></label>
            <label class="adm-field"><span>Повтор</span>
              <input type="password" [(ngModel)]="pwNew2" name="pwn2" autocomplete="new-password" /></label>
          </div>
          <button class="adm-btn adm-btn--accent" (click)="changePw()">Сменить пароль</button>
        </ng-container>
        <ng-template #firebaseAccess>
          <p class="adm-note">
            Доступ управляется через Firebase Authentication. Пароль меняется в Firebase Console
            или через письмо восстановления для выбранного email админа.
          </p>
        </ng-template>
      </section>
    </div>

    <!-- Telegram -->
    <section class="adm-card">
      <div class="adm-card__head">
        <h2>Telegram-уведомления</h2>
        <span class="adm-dot" [class.adm-dot--ok]="tg.configured" [title]="tg.configured ? 'Настроен' : 'Не настроен'"></span>
      </div>

      <p class="adm-note" *ngIf="!tg.configured">
        Уведомления не настроены. Заполните поля ниже — при каждой новой заявке менеджер получит
        сообщение в Telegram с данными клиента и списком позиций.
      </p>
      <p class="adm-note adm-note--ok" *ngIf="tg.configured">
        ✓ Telegram настроен. Новые заявки отправляются автоматически.
      </p>

      <div class="adm-tg-steps" *ngIf="!tg.configured">
        <div class="adm-tg-step">
          <span class="adm-tg-step__num">1</span>
          <span>Откройте <b>&#64;BotFather</b> в Telegram → команда <code>/newbot</code> → скопируйте токен.</span>
        </div>
        <div class="adm-tg-step">
          <span class="adm-tg-step__num">2</span>
          <span>Напишите боту хоть что-нибудь, затем откройте <b>&#64;userinfobot</b> — скопируйте ваш ID.</span>
        </div>
        <div class="adm-tg-step">
          <span class="adm-tg-step__num">3</span>
          <span>Вставьте токен и ID ниже, нажмите «Сохранить и проверить».</span>
        </div>
      </div>

      <div class="adm-grid2" style="margin-top:14px">
        <label class="adm-field">
          <span>Bot Token</span>
          <input [(ngModel)]="tgToken" name="tgToken" placeholder="1234567890:AAF…"
                 autocomplete="off" class="adm-mono" />
        </label>
        <label class="adm-field">
          <span>Chat ID (ваш или группы)</span>
          <input [(ngModel)]="tgChat" name="tgChat" placeholder="-100123456789 или 123456789"
                 autocomplete="off" class="adm-mono" />
        </label>
      </div>
      <div class="adm-actions-row">
        <button class="adm-btn adm-btn--accent" (click)="saveTg()" [disabled]="!tgToken || !tgChat">
          Сохранить и проверить
        </button>
        <button class="adm-btn adm-btn--danger" *ngIf="tg.configured" (click)="clearTg()">
          Отключить
        </button>
      </div>
    </section>

    <!-- Backup / restore -->
    <section class="adm-card">
      <div class="adm-card__head">
        <h2>Резервная копия</h2>
        <span class="adm-sub">каталог · категории · контент · заявки</span>
      </div>
      <div class="adm-actions-row">
        <button class="adm-btn adm-btn--accent" (click)="backup()">↓ Скачать копию (.json)</button>
        <label class="adm-btn">
          ↑ Восстановить из файла
          <input type="file" accept="application/json" hidden (change)="restore($event)" />
        </label>
        <label class="adm-check">
          <input type="checkbox" [(ngModel)]="restoreQuotes" /> с заявками
        </label>
      </div>
      <p class="adm-note">Восстановление заменит текущий каталог, категории и контент данными из файла.</p>
    </section>

    <!-- Danger zone -->
    <section class="adm-card adm-card--danger">
      <div class="adm-card__head"><h2>Опасная зона</h2></div>
      <div class="adm-danger-row">
        <div>
          <b>Сбросить каталог к заводским</b>
          <p class="adm-note">Вернёт исходные товары и категории. Заявки не тронутся.</p>
        </div>
        <button class="adm-btn adm-btn--danger" (click)="resetCatalog()">Сбросить каталог</button>
      </div>
    </section>
  `,
})
export class SettingsAdminComponent {
  readonly store = inject(DataStore);
  readonly auth  = inject(AdminAuth);
  readonly tg    = inject(TelegramService);
  private readonly toast = inject(ToastService);

  pwCur = '';
  pwNew = '';
  pwNew2 = '';
  restoreQuotes = false;
  readonly busy = signal(false);

  tgToken = localStorage.getItem(TG_TOKEN_KEY) ?? '';
  tgChat  = localStorage.getItem(TG_CHAT_KEY)  ?? '';

  changePw(): void {
    if (this.pwNew !== this.pwNew2) return this.toast.err('Пароли не совпадают');
    if (this.pwNew.length < 4) return this.toast.err('Минимум 4 символа');
    if (this.auth.changePassword(this.pwCur, this.pwNew)) {
      this.pwCur = this.pwNew = this.pwNew2 = '';
      this.toast.ok('Пароль изменён');
    } else {
      this.toast.err('Неверный текущий пароль');
    }
  }

  async saveTg(): Promise<void> {
    localStorage.setItem(TG_TOKEN_KEY, this.tgToken.trim());
    localStorage.setItem(TG_CHAT_KEY,  this.tgChat.trim());
    this.tg.applyConfig(this.tgToken.trim(), this.tgChat.trim());
    const ok = await this.tg.sendText('✅ Ф.О.Б · Telegram-уведомления подключены. Новые заявки будут приходить сюда.');
    if (ok) this.toast.ok('Telegram настроен, тестовое сообщение отправлено');
    else this.toast.err('Не удалось отправить тест — проверьте токен и Chat ID');
  }

  clearTg(): void {
    localStorage.removeItem(TG_TOKEN_KEY);
    localStorage.removeItem(TG_CHAT_KEY);
    this.tg.applyConfig('', '');
    this.tgToken = '';
    this.tgChat  = '';
    this.toast.ok('Telegram отключён');
  }

  backup(): void {
    const data = JSON.stringify({ _fob: 1, savedAt: Date.now(), ...this.store.snapshot() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fob-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.ok('Копия скачана');
  }

  restore(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        this.store.importAll(data, { withQuotes: this.restoreQuotes });
        this.toast.ok('Данные восстановлены');
      } catch {
        this.toast.err('Не удалось прочитать файл');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  resetCatalog(): void {
    if (confirm('Сбросить каталог и категории к заводским настройкам?')) {
      this.store.resetCatalog();
      this.toast.ok('Каталог сброшен');
    }
  }
}
