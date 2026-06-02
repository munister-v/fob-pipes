import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Central navigation map. Section components keep calling `go('catalog')` etc.;
 * this maps those legacy section-ids onto the multi-page routes (+ optional
 * in-page fragment), so a single change here re-points the whole site.
 */
type Target = { path: string; fragment?: string };

const MAP: Record<string, Target> = {
  top: { path: '/' },
  home: { path: '/' },
  categories: { path: '/catalog' },
  catalog: { path: '/catalog' },
  quote: { path: '/zayavka' },
  podbor: { path: '/podbor' },
  production: { path: '/proizvodstvo' },
  gallery: { path: '/proizvodstvo', fragment: 'gallery' },
  timeline: { path: '/proizvodstvo', fragment: 'timeline' },
  certs: { path: '/proizvodstvo', fragment: 'certs' },
  services: { path: '/', fragment: 'services' },
  contacts: { path: '/kontakty' },
};

@Injectable({ providedIn: 'root' })
export class NavService {
  private readonly router = inject(Router);

  go(id: string): void {
    const t = MAP[id] ?? { path: '/' };
    this.router.navigate([t.path], t.fragment ? { fragment: t.fragment } : {});
  }
}
