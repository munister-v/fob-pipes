import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataStore } from '../services/data-store.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Обзор</h1>
        <p class="adm-sub">Сводка по каталогу и заявкам</p>
      </div>
    </header>

    <div class="adm-stats">
      <a class="adm-stat" routerLink="/admin/catalog">
        <span class="adm-stat__num">{{ store.products().length }}</span>
        <span class="adm-stat__lbl">позиций в каталоге</span>
      </a>
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ newCount() }}</span>
        <span class="adm-stat__lbl">новых заявок</span>
      </a>
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ store.quotes().length }}</span>
        <span class="adm-stat__lbl">всего заявок</span>
      </a>
      <div class="adm-stat">
        <span class="adm-stat__num">{{ store.categories().length }}</span>
        <span class="adm-stat__lbl">категорий</span>
      </div>
    </div>

    <section class="adm-card">
      <div class="adm-card__head">
        <h2>Последние заявки</h2>
        <a class="adm-link" routerLink="/admin/quotes">Все заявки →</a>
      </div>

      <div class="adm-empty" *ngIf="store.quotes().length === 0">
        Заявок пока нет. Когда клиент отправит заявку с сайта — она появится здесь.
      </div>

      <ul class="adm-recent" *ngIf="store.quotes().length > 0">
        <li *ngFor="let q of recent()">
          <span class="adm-recent__id">{{ q.id }}</span>
          <span class="adm-recent__name">{{ q.name || 'Без имени' }}</span>
          <span class="adm-recent__meta">{{ q.lines.length }} поз. · {{ q.phone }}</span>
          <span class="adm-pill" [class.adm-pill--new]="q.status === 'new'"
                [class.adm-pill--prog]="q.status === 'in_progress'"
                [class.adm-pill--done]="q.status === 'done'">{{ statusLabel(q.status) }}</span>
        </li>
      </ul>
    </section>
  `,
})
export class DashboardComponent {
  readonly store = inject(DataStore);

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);
  readonly recent = computed(() => this.store.quotes().slice(0, 5));

  statusLabel(s: string): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }
}
