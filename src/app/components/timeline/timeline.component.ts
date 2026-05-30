import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Milestone {
  year: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  readonly milestones: Milestone[] = [
    { year: '1998', title: 'Основание «ЮНИПЛАСТ»', text: 'Запуск производства пластиковой канализации в Донецке.' },
    { year: '2004', title: 'Расширение линейки', text: 'Освоено литьё фитингов из ПП и ПВХ под собственную трубу.' },
    { year: '2010', title: 'Европейское оборудование', text: 'Установлены экструзионные линии и термопластавтоматы, обучение специалистов.' },
    { year: '2014', title: 'Марка «Ф.О.Б»', text: 'Продукция выпускается под марками «Юнипласт» и «Ф.О.Б», выход на Aqua-Therm.' },
    { year: 'Сегодня', title: '200+ видов продукции', text: '5 экструзионных линий, 9 ТПА, оптовая и дилерская сеть в нескольких странах.' },
  ];
}
