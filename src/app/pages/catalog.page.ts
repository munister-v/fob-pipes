import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CatalogComponent } from '../components/catalog/catalog.component';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CatalogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-catalog />`,
})
export class CatalogPage {}
