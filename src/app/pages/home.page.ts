import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from '../components/hero/hero.component';
import { CategoriesComponent } from '../components/categories/categories.component';
import { ServicesComponent } from '../components/services/services.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HeroComponent, CategoriesComponent, ServicesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero />
    <app-categories />
    <app-services />
  `,
})
export class HomePage {}
