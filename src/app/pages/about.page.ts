import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProductionComponent } from '../components/production/production.component';
import { GalleryComponent } from '../components/gallery/gallery.component';
import { TimelineComponent } from '../components/timeline/timeline.component';
import { CertificatesComponent } from '../components/certificates/certificates.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [ProductionComponent, GalleryComponent, TimelineComponent, CertificatesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-production />
    <app-gallery />
    <app-timeline />
    <app-certificates />
  `,
})
export class AboutPage {}
