import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
        title: 'Ф.О.Б — производитель труб и фитингов в Донецке',
      },
      {
        path: 'catalog',
        loadComponent: () => import('./pages/catalog.page').then((m) => m.CatalogPage),
        title: 'Каталог — трубы и фитинги ПВХ, ПП, ПНД | Ф.О.Б',
      },
      {
        path: 'catalog/:sku',
        loadComponent: () => import('./pages/product.page').then((m) => m.ProductPage),
        title: 'Карточка товара | Ф.О.Б',
      },
      {
        path: 'podbor',
        loadComponent: () => import('./pages/podbor.page').then((m) => m.PodborPage),
        title: 'Подбор и расчёт канализации | Ф.О.Б',
      },
      {
        path: 'proizvodstvo',
        loadComponent: () => import('./pages/about.page').then((m) => m.AboutPage),
        title: 'Производство и история | Ф.О.Б, Донецк',
      },
      {
        path: 'zayavka',
        loadComponent: () => import('./pages/quote.page').then((m) => m.QuotePage),
        title: 'Собрать заявку | Ф.О.Б',
      },
      {
        path: 'kontakty',
        loadComponent: () => import('./pages/contacts.page').then((m) => m.ContactsPage),
        title: 'Контакты | Ф.О.Б, Донецк',
      },
    ],
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
