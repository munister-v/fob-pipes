import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Shot {
  src: string;
  cap: string;
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
})
export class GalleryComponent {
  // Factory photos — отличаются от тех что в production.component (machine-1/2, prod-2/4, factory.jpg)
  readonly rowA: Shot[] = [
    { src: 'assets/img/factory/IMG_9895.JPG',        cap: 'Цех · панорама' },
    { src: 'assets/img/production/IMG_9918.JPG',     cap: 'Фитинг ПП · внутренняя' },
    { src: 'assets/img/production/IMG_9927.JPG',     cap: 'Тройники · крестовины' },
    { src: 'assets/img/factory/IMG_9912d.JPG',       cap: 'Производство · детали' },
    { src: 'assets/img/production/IMG_9934.JPG',     cap: 'Редукции · переходы' },
    { src: 'assets/img/factory/IMG_9932s.JPG',       cap: 'Линия · экструзия' },
    { src: 'assets/img/production/aqwa_term2006.jpg',cap: 'Aqua-Therm · выставка' },
  ];
  readonly rowB: Shot[] = [
    { src: 'assets/img/factory/IMG_9899.JPG',        cap: 'Склад · заготовки' },
    { src: 'assets/img/production/IMG_9940.JPG',     cap: 'ПП трубы · партия' },
    { src: 'assets/img/factory/IMG_9944d.JPG',       cap: 'Цех · оборудование' },
    { src: 'assets/img/production/IMG_9951.JPG',     cap: 'Фитинг · ОТК' },
    { src: 'assets/img/factory/IMG_9960j.JPG',       cap: 'Готовая продукция' },
    { src: 'assets/img/production/aqwa_term2007.jpg',cap: 'Aqua-Therm · стенд' },
  ];
}
