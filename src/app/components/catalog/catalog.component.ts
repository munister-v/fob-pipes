import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../services/catalog.service';
import { ProductCategory, Usage } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class CatalogComponent {
  private readonly catalog = inject(CatalogService);

  readonly categories = this.catalog.getCategories();
  readonly diameters = this.catalog.getDiameters();
  private readonly products = this.catalog.getProducts();

  // active filters (null = all)
  readonly fCategory = signal<ProductCategory | null>(null);
  readonly fDiameter = signal<number | null>(null);
  readonly fUsage = signal<Usage | null>(null);
  readonly fSearch = signal('');

  readonly filtered = computed(() => {
    const cat = this.fCategory();
    const dia = this.fDiameter();
    const use = this.fUsage();
    const q   = this.fSearch().trim().toLowerCase();
    return this.products.filter(
      (p) =>
        (cat === null || p.category === cat) &&
        (dia === null || p.diameter === dia) &&
        (use === null || p.usage === use) &&
        (!q || p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q))
    );
  });

  setCategory(c: ProductCategory | null): void { this.fCategory.set(c); }
  setDiameter(d: number | null): void { this.fDiameter.set(d); }
  setUsage(u: Usage | null): void { this.fUsage.set(u); }

  reset(): void {
    this.fCategory.set(null);
    this.fDiameter.set(null);
    this.fUsage.set(null);
    this.fSearch.set('');
  }

  readonly hasFilters = computed(
    () => this.fCategory() !== null || this.fDiameter() !== null || this.fUsage() !== null || !!this.fSearch().trim()
  );

  trackBySku(_: number, p: { sku: string }): string { return p.sku; }
  trackById(_: number, item: { id: string }): string { return item.id; }
  trackByNum(_: number, n: number): number { return n; }
}
