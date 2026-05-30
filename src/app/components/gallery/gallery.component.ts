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
    { src: 'assets/img/prod-1.jpg', cap: 'Отводы ПВХ' },
    { src: 'assets/img/machine-1.jpg', cap: 'Цех · ТПА' },
    { src: 'assets/img/prod-3.jpg', cap: 'Муфта · переход' },
    { src: 'assets/img/hero-pipes.jpg', cap: 'Трубы наружные' },
    { src: 'assets/img/prod-5.jpg', cap: 'Фитинги ПП' },
    { src: 'assets/img/factory.jpg', cap: 'Производство' },
  ];
  readonly rowB: Shot[] = [
    { src: 'assets/img/prod-2.jpg', cap: 'Фасонные части' },
    { src: 'assets/img/pipes-2.jpg', cap: 'Раструбная труба' },
    { src: 'assets/img/prod-4.jpg', cap: 'ПВХ · серия' },
    { src: 'assets/img/machine-2.jpg', cap: 'Линия литья' },
    { src: 'assets/img/prod-6.jpg', cap: 'Соединения' },
  ];
}
