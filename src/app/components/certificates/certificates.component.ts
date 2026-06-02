import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Standard {
  code: string;
  fullName: string;
  scope: string;
  params: string[];
  flag: 'ru' | 'eu';
}

interface Award {
  src: string;
  year: string;
  title: string;
}

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent {
  readonly tab = signal<'ru' | 'eu'>('ru');

  readonly standards: Standard[] = [
    // ── Российские ГОСТ ───────────────────────────────────────────────
    {
      flag: 'ru',
      code: 'ГОСТ 22689-2014',
      fullName: 'Трубы и фасонные части полипропиленовые для внутренних систем канализации',
      scope: 'ПП трубы и фитинги для внутренней безнапорной канализации зданий',
      params: [
        'Диаметры: Ø32–110 мм',
        'Рабочая температура: до +60 °C (кратковременно +95 °C)',
        'Давление: безнапорная система',
        'Материал: PP-H (гомополимер)',
        'Цвет: серый/белый — внутренняя, рыжий — для ПВХ',
      ],
    },
    {
      flag: 'ru',
      code: 'ГОСТ 32414-2013',
      fullName: 'Трубы и фасонные части из непластифицированного ПВХ для наружных систем канализации',
      scope: 'Раструбные ПВХ трубы для подземной безнапорной канализации и ливнёвки',
      params: [
        'Диаметры: Ø110–630 мм',
        'Кольцевая жёсткость: SN4 (4 кН/м²), SN8 (8 кН/м²)',
        'Глубина укладки: от 0,8 до 6 м',
        'Цвет: оранжево-коричневый (RAL 8023)',
        'Уплотнение: резиновое кольцо в раструбе',
      ],
    },
    {
      flag: 'ru',
      code: 'ГОСТ 31613-2012',
      fullName: 'Трубы электросварные прямошовные из непластифицированного ПВХ',
      scope: 'ПВХ-У трубы и фитинги для внутренней канализации серого цвета',
      params: [
        'Диаметры: Ø32–160 мм',
        'Толщина стенки: по SDR-номинальному ряду',
        'Температура эксплуатации: 0...+60 °C',
        'Срок службы: не менее 50 лет',
        'Маркировка: ПВХ · диаметр · ГОСТ',
      ],
    },
    {
      flag: 'ru',
      code: 'ГОСТ 18599-2001',
      fullName: 'Трубы напорные из полиэтилена низкого давления (ПНД/ПЭ)',
      scope: 'Трубы ПНД для водоснабжения, газопроводов и технологических трубопроводов',
      params: [
        'Материал: ПЭ100, ПЭ80',
        'Диаметры: Ø16–630 мм',
        'Рабочее давление: SDR 11 → PN16, SDR 17 → PN10',
        'Цвет: чёрный / голубые полосы (водоснабжение)',
        'Соединение: сварка встык, электромуфты',
      ],
    },
    // ── Европейские EN ────────────────────────────────────────────────
    {
      flag: 'eu',
      code: 'EN 1329-1:2014',
      fullName: 'Plastics piping systems — Unplasticized PVC (PVC-U) for soil and waste discharge (low and high temperature) within the building structure',
      scope: 'ПВХ трубы и фитинги для внутренней канализации зданий — европейский эквивалент ГОСТ 22689 для ПВХ',
      params: [
        'Диаметры: DN 32–160 мм',
        'Серии: Serie 1 (стандартная стенка), Serie 2 (усиленная)',
        'Температура: до +60 °C (кратковременно до +95 °C)',
        'Цвет: светло-серый или белый',
        'Маркировка: EN 1329 · DN · Serie · материал',
      ],
    },
    {
      flag: 'eu',
      code: 'EN 1401-1:2019',
      fullName: 'Plastics piping systems — Unplasticized PVC (PVC-U) for non-pressure underground drainage and sewerage',
      scope: 'ПВХ трубы для наружной подземной безнапорной канализации — европейский аналог ГОСТ 32414',
      params: [
        'Диаметры: DN 110–630 мм',
        'Классы жёсткости: SN2 / SN4 / SN8 (EN ISO 9969)',
        'SN4: глубина укладки до 4 м под озеленением',
        'SN8: под проезжей частью и тяжёлой нагрузкой',
        'Уплотнение: кольцо по EN 681-1 (NBR/EPDM)',
      ],
    },
    {
      flag: 'eu',
      code: 'EN 1451-1:2000',
      fullName: 'Plastics piping systems — Polypropylene (PP) for soil and waste discharge (including low and high temperature) within the building structure',
      scope: 'ПП трубы и фитинги для внутренней канализации — европейский аналог ГОСТ 22689 для полипропилена',
      params: [
        'Диаметры: DN 32–160 мм',
        'Материал: PP-H (серия 1) или PP-B (серия 2)',
        'Хим. стойкость: кислоты, щёлочи, жиры (по таблице EN)',
        'Тест на ударную прочность: при –10 °C (Charpy)',
        'Расширение: 0,15 мм/м·°C (PP vs 0,07 у ПВХ)',
      ],
    },
    {
      flag: 'eu',
      code: 'EN ISO 9969',
      fullName: 'Thermoplastics pipes — Determination of ring stiffness',
      scope: 'Метод определения кольцевой жёсткости (SN) для труб наружной канализации — обязателен для EN 1401',
      params: [
        'SN2: 2 кН/м² — лёгкая засыпка, пешеходные зоны',
        'SN4: 4 кН/м² — стандарт для большинства прокладок',
        'SN8: 8 кН/м² — под дорогами с автотранспортом',
        'SN16: 16 кН/м² — особо тяжёлые нагрузки',
        'Испытание: деформация 5% диаметра → измерение F',
      ],
    },
  ];

  readonly awards: Award[] = [
    { src: 'assets/img/production/aqwa_term2005.jpg', year: '2005', title: 'Aqua-Therm Киев 2005' },
    { src: 'assets/img/production/aqwa_term2006.jpg', year: '2006', title: 'Aqua-Therm Киев 2006' },
    { src: 'assets/img/production/aqwa_term2007.jpg', year: '2007', title: 'Aqua-Therm Киев 2007' },
    { src: 'assets/img/production/aqwa_term2008.jpg', year: '2008', title: 'Aqua-Therm Киев 2008' },
  ];

  get filtered(): Standard[] {
    return this.standards.filter(s => s.flag === this.tab());
  }

  count(flag: 'ru' | 'eu'): number {
    return this.standards.filter(s => s.flag === flag).length;
  }
}
