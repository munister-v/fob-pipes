import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './admin-auth.service';
import { DataStore } from '../services/data-store.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Login gate -->
    <div class="adm-login" *ngIf="!auth.authed()">
      <form class="adm-login__card" (ngSubmit)="submit()">
        <div class="adm-login__brand">
          <img src="assets/img/logo-fob.png" alt="Ф.О.Б" />
          <span>Панель управления</span>
        </div>
        <label class="adm-field" *ngIf="auth.usesFirebase()">
          <span>Email админа</span>
          <input type="email" [(ngModel)]="email" name="email"
                 placeholder="admin@example.com" autocomplete="username" autofocus />
        </label>
        <label class="adm-field">
          <span>{{ auth.usesFirebase() ? 'Пароль Firebase' : 'Пароль' }}</span>
          <input type="password" [(ngModel)]="pw" name="pw" placeholder="Введите пароль"
                 autocomplete="current-password" [attr.autofocus]="auth.usesFirebase() ? null : ''" />
        </label>
        <p class="adm-login__err" *ngIf="error()">
          {{ auth.usesFirebase() ? 'Неверный email или пароль' : 'Неверный пароль' }}
        </p>
        <button class="adm-btn adm-btn--accent" type="submit" [disabled]="busy()">
          {{ busy() ? 'Входим…' : 'Войти' }}
        </button>
        <p class="adm-login__hint" *ngIf="auth.isDefault()">Демо-доступ: <code>fob-admin</code></p>
      </form>
    </div>

    <!-- Authed workspace -->
    <div class="adm" *ngIf="auth.authed()" [class.adm--menu]="menu()">
      <div class="adm-scrim" (click)="menu.set(false)"></div>
      <aside class="adm-side">
        <a class="adm-side__brand" routerLink="/admin/dashboard" (click)="menu.set(false)">
          <img src="assets/img/logo-fob.png" alt="Ф.О.Б" />
          <span>Админка</span>
        </a>
        <nav class="adm-nav" (click)="menu.set(false)">
          <a routerLink="/admin/dashboard" routerLinkActive="is-active">
            <span class="adm-nav__ico">▣</span> Обзор
          </a>
          <a routerLink="/admin/catalog" routerLinkActive="is-active">
            <span class="adm-nav__ico">◳</span> Каталог
            <span class="adm-nav__badge">{{ store.products().length }}</span>
          </a>
          <a routerLink="/admin/quotes" routerLinkActive="is-active">
            <span class="adm-nav__ico">✉</span> Заявки
            <span class="adm-nav__badge adm-nav__badge--hot" *ngIf="newCount() > 0">{{ newCount() }}</span>
          </a>
          <a routerLink="/admin/content" routerLinkActive="is-active">
            <span class="adm-nav__ico">✎</span> Контент
          </a>
          <a routerLink="/admin/settings" routerLinkActive="is-active">
            <span class="adm-nav__ico">⚙</span> Настройки
            <span class="adm-nav__dot" *ngIf="auth.isDefault()" title="Смените пароль"></span>
          </a>
        </nav>
        <div class="adm-side__foot">
          <span class="adm-side__be">
            <span class="adm-dot" [class.adm-dot--ok]="store.backend()==='firebase'"></span>
            {{ store.backend() === 'firebase' ? 'Firebase' : 'Локально' }}
          </span>
          <a class="adm-side__link" href="./" target="_blank" rel="noopener">↗ Открыть сайт</a>
          <button class="adm-side__link" (click)="auth.logout()">⎋ Выйти</button>
        </div>
      </aside>

      <main class="adm-main">
        <button class="adm-burger" (click)="toggleMenu()" aria-label="Меню">☰</button>
        <router-outlet />
      </main>
    </div>

    <!-- Toasts -->
    <div class="adm-toasts">
      <div class="adm-toast" *ngFor="let t of toast.items()"
           [class.adm-toast--err]="t.kind==='err'" [class.adm-toast--info]="t.kind==='info'"
           (click)="toast.dismiss(t.id)">{{ t.text }}</div>
    </div>
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AdminAuth);
  readonly store = inject(DataStore);
  readonly toast = inject(ToastService);

  pw = '';
  email = '';
  readonly error = signal(false);
  readonly busy = signal(false);
  readonly menu = signal(false);

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);

  toggleMenu(): void {
    this.menu.update((v) => !v);
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    if (await this.auth.login(this.pw, this.email)) {
      this.error.set(false);
      this.pw = '';
    } else {
      this.error.set(true);
    }
    this.busy.set(false);
  }
}
