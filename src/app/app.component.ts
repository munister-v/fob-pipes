import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { CategoriesComponent } from './components/categories/categories.component';
import { CatalogComponent } from './components/catalog/catalog.component';
import { QuoteComponent } from './components/quote/quote.component';
import { ProductionComponent } from './components/production/production.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ServicesComponent } from './components/services/services.component';
import { TimelineComponent } from './components/timeline/timeline.component';
import { CertificatesComponent } from './components/certificates/certificates.component';
import { ContactsComponent } from './components/contacts/contacts.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    HeroComponent,
    CategoriesComponent,
    CatalogComponent,
    QuoteComponent,
    ProductionComponent,
    GalleryComponent,
    ServicesComponent,
    TimelineComponent,
    CertificatesComponent,
    ContactsComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-header />
    <main>
      <app-hero />
      <app-categories />
      <app-catalog />
      <app-quote />
      <app-production />
      <app-gallery />
      <app-services />
      <app-timeline />
      <app-certificates />
      <app-contacts />
    </main>
    <app-footer />
  `,
})
export class AppComponent {}
