import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Service {
  no: string;
  title: string;
  text: string;
  target: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  readonly services: Service[] = [
    { no: '01', title: 'Производство труб и фитингов', text: 'Собственная экструзия и литьё под давлением полного цикла — от гранулы до готового изделия.', target: 'production' },
    { no: '02', title: 'Опт и поставки под объект', text: 'Партии под смету и график стройки. Работаем с магазинами, бригадами и подрядчиками.', target: 'quote' },
    { no: '03', title: 'Помощь в подборе системы', text: 'Соберём спецификацию по проекту: диаметры, фитинги, количество под вашу трассу.', target: 'catalog' },
    { no: '04', title: 'Складская программа', text: 'Ходовые позиции постоянно в наличии — быстрая отгрузка без ожидания производства.', target: 'catalog' },
    { no: '05', title: 'Доставка и самовывоз', text: 'Отгрузка по Донецку и региону. Самовывоз со склада или доставка на объект.', target: 'contacts' },
  ];

  go(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
