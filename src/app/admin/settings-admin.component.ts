import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../services/data-store.service';
import { AdminAuth } from './admin-auth.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-settings-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Настройки</h1>
        <p class="adm-sub">Хранилище, резервные копии и доступ</p>
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
      </section>
    </div>

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
  readonly auth = inject(AdminAuth);
  private readonly toast = inject(ToastService);

  pwCur = '';
  pwNew = '';
  pwNew2 = '';
  restoreQuotes = false;
  readonly busy = signal(false);

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
