import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../services/data-store.service';
import { Availability, Product, ProductCategory, Usage } from '../models/product.model';

@Component({
  selector: 'app-catalog-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Каталог</h1>
        <p class="adm-sub">{{ store.products().length }} позиций · изменения сразу видны на сайте</p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Поиск…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn adm-btn--accent" (click)="create()">+ Добавить товар</button>
      </div>
    </header>

    <div class="adm-card adm-card--flush">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Артикул</th><th>Название</th><th>Категория</th>
            <th>Ø</th><th>Назначение</th><th>Наличие</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of filtered()">
            <td class="adm-mono">{{ p.sku }}</td>
            <td>{{ p.title }}</td>
            <td>{{ catTitle(p.category) }}</td>
            <td class="adm-mono">{{ p.diameter }}</td>
            <td>{{ p.usage === 'external' ? 'Наружная' : 'Внутренняя' }}</td>
            <td>
              <span class="adm-pill" [class.adm-pill--done]="p.availability === 'check'"
                    [class.adm-pill--prog]="p.availability === 'order'">
                {{ p.availability === 'order' ? 'Под заказ' : 'В наличии' }}
              </span>
            </td>
            <td class="adm-table__act">
              <button class="adm-icon" (click)="edit(p)" title="Изменить">✎</button>
              <button class="adm-icon adm-icon--del" (click)="remove(p)" title="Удалить">✕</button>
            </td>
          </tr>
          <tr *ngIf="filtered().length === 0">
            <td colspan="7" class="adm-empty">Ничего не найдено.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Editor modal -->
    <div class="adm-modal" *ngIf="draft() as d" (click)="cancel()">
      <form class="adm-modal__card" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2 class="adm-modal__title">{{ isNew() ? 'Новый товар' : 'Изменить товар' }}</h2>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Артикул *</span>
            <input [(ngModel)]="d.sku" name="sku" [readonly]="!isNew()" required placeholder="PVC-EX-110" />
          </label>
          <label class="adm-field">
            <span>Диаметр, мм *</span>
            <input type="number" [(ngModel)]="d.diameter" name="diameter" required min="1" />
          </label>
        </div>

        <label class="adm-field">
          <span>Название *</span>
          <input [(ngModel)]="d.title" name="title" required placeholder="Труба канализационная Ø110" />
        </label>

        <label class="adm-field">
          <span>Описание</span>
          <input [(ngModel)]="d.spec" name="spec" placeholder="Наружная · ПВХ · раструбная" />
        </label>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Категория</span>
            <select [(ngModel)]="d.category" name="category">
              <option *ngFor="let c of store.categories()" [value]="c.id">{{ c.title }}</option>
            </select>
          </label>
          <label class="adm-field">
            <span>Материал</span>
            <input [(ngModel)]="d.material" name="material" placeholder="ПВХ" />
          </label>
        </div>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Назначение</span>
            <select [(ngModel)]="d.usage" name="usage">
              <option value="internal">Внутренняя</option>
              <option value="external">Наружная</option>
            </select>
          </label>
          <label class="adm-field">
            <span>Наличие</span>
            <select [(ngModel)]="d.availability" name="availability">
              <option value="check">В наличии (уточнить)</option>
              <option value="order">Под заказ</option>
            </select>
          </label>
        </div>

        <p class="adm-modal__err" *ngIf="dupErr()">Товар с таким артикулом уже существует.</p>

        <div class="adm-modal__foot">
          <button type="button" class="adm-btn" (click)="cancel()">Отмена</button>
          <button type="submit" class="adm-btn adm-btn--accent">Сохранить</button>
        </div>
      </form>
    </div>
  `,
})
export class CatalogAdminComponent {
  readonly store = inject(DataStore);
  readonly search = signal('');
  readonly draft = signal<Product | null>(null);
  readonly isNew = signal(false);
  readonly dupErr = signal(false);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.store.products();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.spec.toLowerCase().includes(q)
    );
  });

  catTitle(id: ProductCategory): string {
    return this.store.categories().find((c) => c.id === id)?.title ?? id;
  }

  create(): void {
    this.isNew.set(true);
    this.dupErr.set(false);
    this.draft.set({
      sku: '',
      title: '',
      category: 'pipe' as ProductCategory,
      usage: 'internal' as Usage,
      diameter: 110,
      spec: '',
      availability: 'check' as Availability,
      material: 'ПВХ',
    });
  }

  edit(p: Product): void {
    this.isNew.set(false);
    this.dupErr.set(false);
    this.draft.set({ ...p });
  }

  cancel(): void {
    this.draft.set(null);
  }

  save(): void {
    const d = this.draft();
    if (!d || !d.sku.trim() || !d.title.trim()) return;
    if (this.isNew() && this.store.products().some((p) => p.sku === d.sku)) {
      this.dupErr.set(true);
      return;
    }
    this.store.upsertProduct({ ...d, diameter: +d.diameter });
    this.draft.set(null);
  }

  remove(p: Product): void {
    if (confirm(`Удалить «${p.title}» (${p.sku})?`)) this.store.deleteProduct(p.sku);
  }
}
