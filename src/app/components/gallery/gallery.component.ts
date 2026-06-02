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
  readonly rowA: Shot[] = [
    { src: 'assets/img/prod-1.jpg',    cap: 'Трубы ПП · раструбные' },
    { src: 'assets/img/prod-3.jpg',    cap: 'Фитинг ПВХ · наружная' },
    { src: 'assets/img/production/IMG_9918.JPG', cap: 'Фитинг ПП · внутренняя' },
    { src: 'assets/img/factory.jpg',   cap: 'Склад готовой продукции' },
    { src: 'assets/img/prod-5.jpg',    cap: 'Упаковка · фирменная' },
    { src: 'assets/img/production/IMG_9934.JPG', cap: 'Редукции · переходы' },
    { src: 'assets/img/production/aqwa_term2006.jpg', cap: 'Aqua-Therm · выставка' },
  ];
  readonly rowB: Shot[] = [
    { src: 'assets/img/prod-4.jpg',    cap: 'Отводы ПП · паллеты' },
    { src: 'assets/img/pipes-2.jpg',   cap: 'Трубы ПВХ · наружные' },
    { src: 'assets/img/prod-6.jpg',    cap: 'Ассортимент · фитинг' },
    { src: 'assets/img/prod-2.jpg',    cap: 'Труба ПВХ · рыжая' },
    { src: 'assets/img/production/IMG_9927.JPG', cap: 'Тройники · крестовины' },
    { src: 'assets/img/production/aqwa_term2007.jpg', cap: 'Aqua-Therm · стенд' },
  ];
}
