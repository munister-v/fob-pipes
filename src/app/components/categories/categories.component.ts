import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavService } from '../../core/nav.service';
import { CatalogService } from '../../services/catalog.service';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent {
  private readonly catalog = inject(CatalogService);
  readonly categories = this.catalog.getCategories();

  private readonly nav = inject(NavService);

  go(id: string): void {
    this.nav.go(id);
  }
}
