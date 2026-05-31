import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './admin-auth.service';
import { DataStore } from '../services/data-store.service';

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
        <label class="adm-field">
          <span>Пароль</span>
          <input type="password" [(ngModel)]="pw" name="pw" placeholder="Введите пароль"
                 autocomplete="current-password" autofocus />
        </label>
        <p class="adm-login__err" *ngIf="error()">Неверный пароль</p>
        <button class="adm-btn adm-btn--accent" type="submit">Войти</button>
        <p class="adm-login__hint">Демо-доступ: <code>fob-admin</code></p>
      </form>
    </div>

    <!-- Authed workspace -->
    <div class="adm" *ngIf="auth.authed()">
      <aside class="adm-side">
        <a class="adm-side__brand" routerLink="/admin/dashboard">
          <img src="assets/img/logo-fob.png" alt="Ф.О.Б" />
          <span>Админка</span>
        </a>
        <nav class="adm-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="is-active">
            <span class="adm-nav__ico">▣</span> Обзор
          </a>
          <a routerLink="/admin/catalog" routerLinkActive="is-active">
            <span class="adm-nav__ico">◳</span> Каталог
            <span class="adm-nav__badge">{{ store.products().length }}</span>
          </a>
          <a routerLink="/admin/quotes" routerLinkActive="is-active">
            <span class="adm-nav__ico">✉</span> Заявки
            <span class="adm-nav__badge" *ngIf="newCount() > 0">{{ newCount() }}</span>
          </a>
          <a routerLink="/admin/content" routerLinkActive="is-active">
            <span class="adm-nav__ico">✎</span> Контент
          </a>
        </nav>
        <div class="adm-side__foot">
          <a class="adm-side__link" href="/" target="_blank" rel="noopener">↗ Открыть сайт</a>
          <button class="adm-side__link" (click)="auth.logout()">⎋ Выйти</button>
        </div>
      </aside>
      <main class="adm-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AdminAuth);
  readonly store = inject(DataStore);

  pw = '';
  readonly error = signal(false);

  readonly newCount = () => this.store.quotes().filter((q) => q.status === 'new').length;

  submit(): void {
    if (this.auth.login(this.pw)) {
      this.error.set(false);
      this.pw = '';
    } else {
      this.error.set(true);
    }
  }
}
