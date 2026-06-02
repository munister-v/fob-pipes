import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from './admin-auth.service';
import { DataStore } from '../services/data-store.service';
import { ToastService } from './toast.service';

const ICONS: Record<string, string> = {
  dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  catalog:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h8"/></svg>`,
  quotes:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  content:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  clients:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  warehouse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><rect x="7" y="13" width="10" height="8"/><path d="M7 17h10"/></svg>`,
  settings:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  site:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  logout:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Login ──────────────────────────────────────────────────── -->
    <div class="adm-login" *ngIf="!auth.authed()">
      <div class="adm-login__bg" aria-hidden="true">
        <div class="adm-login__glow"></div>
        <div class="adm-login__grid"></div>
      </div>
      <form class="adm-login__card" (ngSubmit)="submit()">
        <div class="adm-login__brand">
          <img src="assets/img/logo-fob.png" alt="Ф.О.Б" />
          <div>
            <div class="adm-login__brand-name">Ф.О.Б</div>
            <div class="adm-login__brand-sub">Панель управления</div>
          </div>
        </div>

        <div class="adm-login__divider"></div>

        <label class="adm-field" *ngIf="auth.usesFirebase()">
          <span>Email</span>
          <input type="email" [(ngModel)]="email" name="email"
                 placeholder="admin@fob.com" autocomplete="username" autofocus />
        </label>
        <label class="adm-field">
          <span>Пароль</span>
          <input type="password" [(ngModel)]="pw" name="pw" placeholder="••••••••"
                 autocomplete="current-password" [attr.autofocus]="auth.usesFirebase() ? null : ''" />
        </label>

        <div class="adm-login__err" *ngIf="error()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ auth.usesFirebase() ? 'Неверный email или пароль' : 'Неверный пароль' }}
        </div>

        <button class="adm-btn adm-btn--accent adm-btn--full" type="submit" [disabled]="busy()">
          <span *ngIf="!busy()">Войти в панель</span>
          <span *ngIf="busy()">Входим…</span>
        </button>

        <p class="adm-login__hint" *ngIf="auth.isDefault()">
          Демо: <code>fob-admin</code>
        </p>
      </form>
    </div>

    <!-- ── Workspace ─────────────────────────────────────────────── -->
    <div class="adm" *ngIf="auth.authed()" [class.adm--menu]="menu()">
      <div class="adm-scrim" (click)="menu.set(false)"></div>

      <aside class="adm-side">
        <!-- Brand -->
        <a class="adm-side__brand" routerLink="/admin/dashboard" (click)="menu.set(false)">
          <img src="assets/img/logo-fob.png" alt="Ф.О.Б" />
          <div>
            <div class="adm-side__brand-name">Ф.О.Б</div>
            <div class="adm-side__brand-sub">Панель управления</div>
          </div>
        </a>

        <!-- Nav -->
        <nav class="adm-nav" (click)="menu.set(false)">
          <span class="adm-nav__label">Главное</span>
          <a routerLink="/admin/dashboard" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('dashboard')"></span>
            Обзор
          </a>
          <a routerLink="/admin/quotes" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('quotes')"></span>
            Заявки
            <span class="adm-nav__badge adm-nav__badge--hot" *ngIf="newCount() > 0">{{ newCount() }}</span>
          </a>

          <span class="adm-nav__label">Каталог и сайт</span>
          <a routerLink="/admin/catalog" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('catalog')"></span>
            Каталог
            <span class="adm-nav__badge">{{ store.products().length }}</span>
          </a>
          <a routerLink="/admin/content" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('content')"></span>
            Контент
          </a>

          <a routerLink="/admin/clients" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('clients')"></span>
            Клиенты
            <span class="adm-nav__badge">{{ clientCount() }}</span>
          </a>

          <a routerLink="/admin/warehouse" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('warehouse')"></span>
            Склад
            <span class="adm-nav__badge adm-nav__badge--hot" *ngIf="lowStockCount() > 0">{{ lowStockCount() }}</span>
          </a>

          <span class="adm-nav__label">Система</span>
          <a routerLink="/admin/settings" routerLinkActive="is-active">
            <span class="adm-nav__ico" [innerHTML]="ico('settings')"></span>
            Настройки
            <span class="adm-nav__dot" *ngIf="auth.isDefault()" title="Смените пароль по умолчанию"></span>
          </a>
        </nav>

        <!-- Footer -->
        <div class="adm-side__foot">
          <div class="adm-side__be">
            <span class="adm-dot" [class.adm-dot--ok]="store.backend()==='firebase'"></span>
            <span>{{ store.backend() === 'firebase' ? 'Firebase · realtime' : 'localStorage · локально' }}</span>
          </div>
          <div class="adm-side__actions">
            <a class="adm-side__link" href="./" target="_blank" rel="noopener">
              <span [innerHTML]="ico('site')"></span> Сайт
            </a>
            <button class="adm-side__link adm-side__link--out" (click)="auth.logout()">
              <span [innerHTML]="ico('logout')"></span> Выйти
            </button>
          </div>
        </div>
      </aside>

      <main class="adm-main">
        <button class="adm-burger" (click)="toggleMenu()" aria-label="Меню">
          <span></span><span></span><span></span>
        </button>
        <router-outlet />
      </main>
    </div>

    <!-- ── Toasts ──────────────────────────────────────────────────── -->
    <div class="adm-toasts">
      <div class="adm-toast" *ngFor="let t of toast.items()"
           [class.adm-toast--err]="t.kind==='err'"
           [class.adm-toast--info]="t.kind==='info'"
           (click)="toast.dismiss(t.id)">
        {{ t.text }}
      </div>
    </div>
  `,
})
export class AdminShellComponent {
  readonly auth  = inject(AdminAuth);
  readonly store = inject(DataStore);
  readonly toast = inject(ToastService);

  pw = '';
  email = this.auth.savedEmail;
  readonly error = signal(false);
  readonly busy  = signal(false);
  readonly menu  = signal(false);

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);

  readonly clientCount = computed(() => {
    const phones = new Set(
      this.store.quotes()
        .map((q) => q.phone?.replace(/\D/g, '').replace(/^8/, '7'))
        .filter(Boolean)
    );
    return phones.size;
  });

  /** Товары, где доступный остаток (склад − резерв) исчерпан, но физически они есть либо были. */
  readonly lowStockCount = computed(() => {
    const res = this.store.reservations();
    return this.store.products().filter((p) => {
      const stock = p.stock ?? 0;
      if (stock <= 0) return false; // не считаем товары, для которых склад вообще не ведётся
      return stock - (res.get(p.sku) ?? 0) <= 0;
    }).length;
  });

  ico(name: string): string { return ICONS[name] ?? ''; }

  toggleMenu(): void { this.menu.update((v) => !v); }

  async submit(): Promise<void> {
    this.busy.set(true);
    if (await this.auth.login(this.pw, this.email)) {
      this.error.set(false);
      this.auth.saveEmail(this.email);
      this.pw = '';
    } else {
      this.error.set(true);
    }
    this.busy.set(false);
  }
}
