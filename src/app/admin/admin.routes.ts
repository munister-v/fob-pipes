import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./catalog-admin.component').then((m) => m.CatalogAdminComponent),
      },
      {
        path: 'quotes',
        loadComponent: () => import('./quotes-admin.component').then((m) => m.QuotesAdminComponent),
      },
      {
        path: 'content',
        loadComponent: () =>
          import('./content-admin.component').then((m) => m.ContentAdminComponent),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
