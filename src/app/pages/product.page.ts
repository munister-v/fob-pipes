import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../services/catalog.service';
import { QuoteService } from '../services/quote.service';
import { DataStore } from '../services/data-store.service';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="prod-page">
      <div class="shell">

        <nav class="prod-page__crumbs">
          <a routerLink="/">Главная</a>
          <span>/</span>
          <a routerLink="/catalog">Каталог</a>
          <span>/</span>
          <a routerLink="/catalog">{{ catTitle() }}</a>
          <span>/</span>
          <span class="prod-page__crumb-cur">{{ product()?.title || 'Товар' }}</span>
        </nav>

        <ng-container *ngIf="product() as p; else notFound">

          <div class="prod-page__main">
            <!-- Левая колонка: фото -->
            <div class="prod-page__media">
              <div class="prod-page__photo" [class.is-empty]="!p.image">
                <img *ngIf="p.image" [src]="p.image" [alt]="p.title" />
                <div *ngIf="!p.image" class="prod-page__placeholder">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="1" stroke-linecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Фото не загружено</span>
                </div>
              </div>
              <div class="prod-page__chips">
                <span class="prod-page__chip prod-page__chip--accent">
                  <span class="prod-page__chip-dot"></span>
                  {{ p.availability === 'order' ? 'Под заказ' : 'В наличии · уточнить' }}
                </span>
                <span class="prod-page__chip" [class.prod-page__chip--ext]="p.usage === 'external'">
                  {{ p.usage === 'external' ? 'Наружная канализация' : 'Внутренняя канализация' }}
                </span>
              </div>
            </div>

            <!-- Правая колонка: инфо -->
            <div class="prod-page__info">
              <div class="prod-page__sku mono-num">Артикул · {{ p.sku }}</div>
              <h1 class="prod-page__title">{{ p.title }}</h1>
              <p class="prod-page__spec">{{ p.spec }}</p>

              <!-- Характеристики -->
              <dl class="prod-page__specs">
                <dt>Категория</dt><dd>{{ catTitle() }}</dd>
                <dt>Диаметр номинальный</dt><dd class="mono-num">Ø {{ p.diameter }} мм</dd>
                <dt>Материал</dt><dd>{{ p.material }}</dd>
                <dt>Назначение</dt><dd>{{ p.usage === 'external' ? 'Наружная канализация' : 'Внутренняя канализация' }}</dd>
                <dt>Единица измерения</dt><dd>{{ p.unit || 'шт' }}</dd>
                <dt *ngIf="p.sku1c">Код 1С</dt>
                <dd *ngIf="p.sku1c" class="mono-num">{{ p.sku1c }}</dd>
              </dl>

              <!-- Цена -->
              <div class="prod-page__price" *ngIf="(p.priceRetail ?? 0) > 0">
                <div class="prod-page__price-main">
                  <span class="prod-page__price-val mono-num">{{ p.priceRetail | number:'1.0-0':'ru' }} ₽</span>
                  <span class="prod-page__price-unit">за {{ p.unit || 'шт' }}</span>
                </div>
                <div class="prod-page__price-opt" *ngIf="(p.priceWholesale ?? 0) > 0 && p.priceWholesale! < p.priceRetail!">
                  Опт от <b class="mono-num">{{ p.priceWholesale | number:'1.0-0':'ru' }} ₽</b>
                  <ng-container *ngIf="p.wholesaleFrom"> · партия от {{ p.wholesaleFrom }} {{ p.unit || 'шт' }}</ng-container>
                </div>
              </div>
              <div class="prod-page__price prod-page__price--empty" *ngIf="(p.priceRetail ?? 0) === 0">
                <span class="prod-page__price-val">Цена по запросу</span>
                <span class="prod-page__price-unit">Уточняется менеджером</span>
              </div>

              <!-- Действия -->
              <div class="prod-page__actions">
                <button class="btn btn--accent btn--lg" (click)="addToQuote(p)" [disabled]="quote.has(p.sku)">
                  <span *ngIf="!quote.has(p.sku)">+ Добавить в заявку</span>
                  <span *ngIf="quote.has(p.sku)">✓ В заявке</span>
                </button>
                <a class="btn btn--lg" routerLink="/zayavka">К заявке →</a>
              </div>

              <!-- Контакты -->
              <div class="prod-page__contact">
                <div class="prod-page__contact-h">Узнать наличие и доставку</div>
                <div class="prod-page__contact-row">
                  <a [href]="'tel:' + tel(store.content().phone)" class="prod-page__contact-link">
                    {{ store.content().phone }}
                  </a>
                  <a [href]="'mailto:' + store.content().email"
                     class="prod-page__contact-link prod-page__contact-link--alt">
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Похожие товары -->
          <div class="prod-page__related" *ngIf="related().length > 0">
            <h2 class="prod-page__related-h">Похожие позиции в категории «{{ catTitle() }}»</h2>
            <div class="prod-page__related-grid">
              <a *ngFor="let r of related()" [routerLink]="['/catalog', r.sku]" class="prod-page__related-card">
                <span class="prod-page__related-sku mono-num">{{ r.sku }}</span>
                <span class="prod-page__related-title">{{ r.title }}</span>
                <span class="prod-page__related-meta mono-num">Ø {{ r.diameter }}</span>
                <span class="prod-page__related-price mono-num" *ngIf="(r.priceRetail ?? 0) > 0">
                  {{ r.priceRetail | number:'1.0-0':'ru' }} ₽
                </span>
              </a>
            </div>
          </div>

        </ng-container>

        <ng-template #notFound>
          <div class="prod-page__notfound">
            <h1>Товар не найден</h1>
            <p>Артикул <b>{{ sku() }}</b> не существует в каталоге.</p>
            <a class="btn btn--accent" routerLink="/catalog">← Вернуться в каталог</a>
          </div>
        </ng-template>

      </div>
    </section>
  `,
  styleUrl: './product.page.scss',
})
export class ProductPage {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly catalog = inject(CatalogService);
  readonly quote = inject(QuoteService);
  readonly store = inject(DataStore);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly sku = computed(() => this.params().get('sku') ?? '');

  readonly product = computed(() =>
    this.catalog.getProducts().find((p) => p.sku === this.sku())
  );

  readonly catTitle = computed(() => {
    const p = this.product();
    if (!p) return '';
    return this.catalog.getCategories().find((c) => c.id === p.category)?.title ?? p.category;
  });

  readonly related = computed(() => {
    const p = this.product();
    if (!p) return [];
    return this.catalog.getProducts()
      .filter((x) => x.category === p.category && x.sku !== p.sku)
      .sort((a, b) => Math.abs(a.diameter - p.diameter) - Math.abs(b.diameter - p.diameter))
      .slice(0, 6);
  });

  addToQuote(p: NonNullable<ReturnType<ProductPage['product']>>): void {
    this.quote.add(p);
  }

  tel(raw: string): string {
    return raw.replace(/[^\d+]/g, '');
  }
}
