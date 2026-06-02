import { CategoryDef, Product } from '../models/product.model';

export const CATEGORIES: CategoryDef[] = [
  { id: 'pipe',     index: '01', title: 'Трубы',           blurb: 'Трубы ПП и ПВХ для внутренней и наружной канализации, диаметры 32–200 мм.',   img: 'assets/img/products/all.jpg' },
  { id: 'bend',     index: '02', title: 'Колена / Отводы', blurb: 'Угловые отводы 20°–90° для изменения направления трассы.',                    img: 'assets/img/products/bend.jpg' },
  { id: 'tee',      index: '03', title: 'Тройники',        blurb: 'Тройники и крестовины для врезки боковых ответвлений.',                        img: 'assets/img/products/tee.jpg' },
  { id: 'coupling', index: '04', title: 'Муфты',           blurb: 'Соединительные муфты для стыковки прямых участков трубопровода.',              img: 'assets/img/products/coupling.jpg' },
  { id: 'reducer',  index: '05', title: 'Редукции',        blurb: 'Переходы между диаметрами — жёсткие и резиновые.',                            img: 'assets/img/products/reducer.jpg' },
  { id: 'revision', index: '06', title: 'Ревизии',         blurb: 'Прочистные элементы для доступа к трубопроводу.',                             img: 'assets/img/products/revision.jpg' },
  { id: 'plug',     index: '07', title: 'Заглушки',        blurb: 'Концевые заглушки для герметизации торцов труб.',                             img: 'assets/img/products/external-set.jpg' },
  { id: 'clamp',    index: '08', title: 'Крепления',       blurb: 'Хомуты и трубные крепления — сборные и одиночные.',                           img: 'assets/img/products/clamp.jpg' },
  { id: 'special',  index: '09', title: 'Спецэлементы',    blurb: 'Трапы, АБУ, манжеты, грибки, патрубки, переходники чугун/пластик.',           img: 'assets/img/products/floor-drain.jpg' },
];

export const PRODUCTS: Product[] = [

  // ══════════════════════════════════════════════════
  // ТРУБЫ — ВНУТРЕННЯЯ КАНАЛИЗАЦИЯ
  // ══════════════════════════════════════════════════
  {
    sku: 'PP-IN-32',
    title: 'Труба канализационная Ø32 ПП',
    category: 'pipe', usage: 'internal', diameter: 32,
    spec: 'Внутренняя · ПП · стенка 1.8 мм · L 200–2000 мм',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 49,
  },
  {
    sku: 'PP-IN-40',
    title: 'Труба канализационная Ø40 ПП',
    category: 'pipe', usage: 'internal', diameter: 40,
    spec: 'Внутренняя · ПП · стенка 1.8 мм · L 200–2000 мм',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 78,
  },
  {
    sku: 'PP-IN-50',
    title: 'Труба канализационная Ø50 ПП',
    category: 'pipe', usage: 'internal', diameter: 50,
    spec: 'Внутренняя · ПП · стенка 2.2 мм · L 200–4000 мм',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 62,
  },
  {
    sku: 'PP-IN-110',
    title: 'Труба канализационная Ø110 ПП',
    category: 'pipe', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПП · стенка 2.2 мм · L 200–6000 мм',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 212,
  },
  {
    sku: 'PP-IN-110-HD',
    title: 'Труба канализационная Ø110 ПП усиленная',
    category: 'pipe', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПП · стенка 2.7 мм · L 250–6000 мм · НОВИНКА',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 240,
  },
  {
    sku: 'PVC-IN-110',
    title: 'Труба канализационная Ø110 ПВХ (серая)',
    category: 'pipe', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПВХ · стенка 2.2 мм · L 250–3000 мм',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 180,
  },

  // ══════════════════════════════════════════════════
  // ТРУБЫ — НАРУЖНАЯ КАНАЛИЗАЦИЯ (ПВХ рыжая)
  // ══════════════════════════════════════════════════
  {
    sku: 'PVC-EX-110',
    title: 'Труба канализационная Ø110 ПВХ наружная',
    category: 'pipe', usage: 'external', diameter: 110,
    spec: 'Наружная · ПВХ · рыжая · раструбная · SN4',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 320,
  },
  {
    sku: 'PVC-EX-160',
    title: 'Труба канализационная Ø160 ПВХ наружная',
    category: 'pipe', usage: 'external', diameter: 160,
    spec: 'Наружная · ПВХ · рыжая · раструбная · SN4',
    material: 'ПВХ', availability: 'order', unit: 'шт',
  },
  {
    sku: 'PVC-EX-200',
    title: 'Труба канализационная Ø200 ПВХ наружная',
    category: 'pipe', usage: 'external', diameter: 200,
    spec: 'Наружная · ПВХ · рыжая · раструбная · SN4',
    material: 'ПВХ', availability: 'order', unit: 'шт',
  },

  // ══════════════════════════════════════════════════
  // КОЛЕНА / ОТВОДЫ — ВНУТРЕННИЕ
  // ══════════════════════════════════════════════════
  {
    sku: 'BND-IN-32',
    title: 'Колено Ø32 внутреннее',
    category: 'bend', usage: 'internal', diameter: 32,
    spec: 'Углы 90° / 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 16,
  },
  {
    sku: 'BND-IN-40',
    title: 'Колено Ø40 внутреннее',
    category: 'bend', usage: 'internal', diameter: 40,
    spec: 'Углы 90° / 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 16,
  },
  {
    sku: 'BND-IN-50',
    title: 'Колено Ø50 внутреннее',
    category: 'bend', usage: 'internal', diameter: 50,
    spec: 'Углы 90° / 67° / 45° / 30° / 20° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 16,
  },
  {
    sku: 'BND-IN-110',
    title: 'Колено Ø110 внутреннее',
    category: 'bend', usage: 'internal', diameter: 110,
    spec: 'Углы 90° / 67° / 45° / 30° / 20° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 47,
  },

  // КОЛЕНА — НАРУЖНЫЕ
  {
    sku: 'BND-EX-110',
    title: 'Колено Ø110 наружное',
    category: 'bend', usage: 'external', diameter: 110,
    spec: 'Углы 90° / 67° / 45° / 30° / 20° · ПВХ рыжий',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 61,
  },

  // ══════════════════════════════════════════════════
  // ТРОЙНИКИ — ВНУТРЕННИЕ
  // ══════════════════════════════════════════════════
  {
    sku: 'TEE-IN-32',
    title: 'Тройник 32/32 внутренний',
    category: 'tee', usage: 'internal', diameter: 32,
    spec: 'D32/32 · 90° / 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 70,
  },
  {
    sku: 'TEE-IN-40',
    title: 'Тройник 40/40 внутренний',
    category: 'tee', usage: 'internal', diameter: 40,
    spec: 'D40/40 · 90° / 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 30,
  },
  {
    sku: 'TEE-IN-50',
    title: 'Тройник 50/50 внутренний',
    category: 'tee', usage: 'internal', diameter: 50,
    spec: 'D50/50 · 90° / 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 27,
  },
  {
    sku: 'TEE-IN-110-110',
    title: 'Тройник 110/110 внутренний',
    category: 'tee', usage: 'internal', diameter: 110,
    spec: 'D110/110 · 90° или 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 78,
  },
  {
    sku: 'TEE-IN-110-50',
    title: 'Тройник 110/50 внутренний',
    category: 'tee', usage: 'internal', diameter: 110,
    spec: 'D110/50 · 90° или 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 53,
  },
  {
    sku: 'CROSS-IN-110',
    title: 'Крестовина 110/110/110',
    category: 'tee', usage: 'internal', diameter: 110,
    spec: 'D110/110/110 · 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 152,
  },
  {
    sku: 'CROSS-IN-110-110-50',
    title: 'Крестовина 110/110/50 проходная',
    category: 'tee', usage: 'internal', diameter: 110,
    spec: 'D110/110/50 · проходная · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 144,
  },
  {
    sku: 'CROSS-IN-110-50-50',
    title: 'Крестовина 110/50/50',
    category: 'tee', usage: 'internal', diameter: 110,
    spec: 'D110/50/50 · 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 116,
  },
  {
    sku: 'CROSS-IN-50',
    title: 'Крестовина 50/50/50',
    category: 'tee', usage: 'internal', diameter: 50,
    spec: 'D50/50/50 · 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 62,
  },

  // ТРОЙНИКИ — НАРУЖНЫЕ
  {
    sku: 'TEE-EX-110-45',
    title: 'Тройник Ø110 наружный 45°',
    category: 'tee', usage: 'external', diameter: 110,
    spec: 'D110/110 · 45° · ПВХ рыжий',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 111,
  },
  {
    sku: 'TEE-EX-110-90',
    title: 'Тройник Ø110 наружный 90°',
    category: 'tee', usage: 'external', diameter: 110,
    spec: 'D110/110 · 90° · ПВХ рыжий',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 103,
  },

  // ══════════════════════════════════════════════════
  // МУФТЫ
  // ══════════════════════════════════════════════════
  {
    sku: 'CUP-IN-32',
    title: 'Муфта соединительная Ø32',
    category: 'coupling', usage: 'internal', diameter: 32,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 67,
  },
  {
    sku: 'CUP-IN-40',
    title: 'Муфта соединительная Ø40',
    category: 'coupling', usage: 'internal', diameter: 40,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 28,
  },
  {
    sku: 'CUP-IN-50',
    title: 'Муфта соединительная Ø50',
    category: 'coupling', usage: 'internal', diameter: 50,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 26,
  },
  {
    sku: 'CUP-IN-110',
    title: 'Муфта соединительная Ø110',
    category: 'coupling', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 55,
  },
  {
    sku: 'CUP-EX-110',
    title: 'Муфта соединительная Ø110 наружная',
    category: 'coupling', usage: 'external', diameter: 110,
    spec: 'Наружная · ПВХ рыжий · раструбная',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 65,
  },

  // ══════════════════════════════════════════════════
  // РЕДУКЦИИ / ПЕРЕХОДЫ
  // ══════════════════════════════════════════════════
  {
    sku: 'RED-IN-110-50',
    title: 'Редукция 110→50',
    category: 'reducer', usage: 'internal', diameter: 110,
    spec: 'D110/50 · прямая · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 31,
  },
  {
    sku: 'RED-IN-50-40',
    title: 'Редукция 50→40',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/40 · прямая · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 18,
  },
  {
    sku: 'RED-IN-50-32',
    title: 'Редукция 50→32 прямая',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/32 · прямая · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 18,
  },
  {
    sku: 'RED-IN-50-32-90',
    title: 'Редукция 50→32 угловая 90°',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/32 · угол 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 35,
  },
  {
    sku: 'RED-RUB-50-40',
    title: 'Редукция резиновая 50→40',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/40 · резиновая манжета',
    material: 'Резина', availability: 'check', unit: 'шт',
    priceRetail: 14,
  },
  {
    sku: 'RED-RUB-50-32',
    title: 'Редукция резиновая 50→32',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/32 · резиновая манжета',
    material: 'Резина', availability: 'check', unit: 'шт',
    priceRetail: 14,
  },
  {
    sku: 'RED-RUB-50-25',
    title: 'Редукция резиновая 50→25',
    category: 'reducer', usage: 'internal', diameter: 50,
    spec: 'D50/25 · резиновая манжета',
    material: 'Резина', availability: 'check', unit: 'шт',
    priceRetail: 14,
  },
  {
    sku: 'RED-RUB-32-25',
    title: 'Редукция резиновая 32→25',
    category: 'reducer', usage: 'internal', diameter: 32,
    spec: 'D32/25 · резиновая манжета',
    material: 'Резина', availability: 'check', unit: 'шт',
    priceRetail: 14,
  },

  // ══════════════════════════════════════════════════
  // РЕВИЗИИ
  // ══════════════════════════════════════════════════
  {
    sku: 'REV-IN-50',
    title: 'Ревизия Ø50 внутренняя',
    category: 'revision', usage: 'internal', diameter: 50,
    spec: 'Внутренняя · ПП · прочистная крышка',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 38,
  },
  {
    sku: 'REV-IN-110',
    title: 'Ревизия Ø110 внутренняя',
    category: 'revision', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПП · прочистная крышка',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 99,
  },
  {
    sku: 'REV-EX-110',
    title: 'Ревизия Ø110 наружная',
    category: 'revision', usage: 'external', diameter: 110,
    spec: 'Наружная · ПВХ рыжий',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 133,
  },

  // ══════════════════════════════════════════════════
  // ЗАГЛУШКИ
  // ══════════════════════════════════════════════════
  {
    sku: 'PLG-IN-32',
    title: 'Заглушка Ø32',
    category: 'plug', usage: 'internal', diameter: 32,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 11,
  },
  {
    sku: 'PLG-IN-40',
    title: 'Заглушка Ø40',
    category: 'plug', usage: 'internal', diameter: 40,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 11,
  },
  {
    sku: 'PLG-IN-50',
    title: 'Заглушка Ø50',
    category: 'plug', usage: 'internal', diameter: 50,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 10,
  },
  {
    sku: 'PLG-IN-110',
    title: 'Заглушка Ø110',
    category: 'plug', usage: 'internal', diameter: 110,
    spec: 'Внутренняя · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 24,
  },
  {
    sku: 'PLG-EX-110',
    title: 'Заглушка Ø110 наружная',
    category: 'plug', usage: 'external', diameter: 110,
    spec: 'Наружная · ПВХ рыжий',
    material: 'ПВХ', availability: 'check', unit: 'шт',
    priceRetail: 29,
  },

  // ══════════════════════════════════════════════════
  // КРЕПЛЕНИЯ / ХОМУТЫ
  // ══════════════════════════════════════════════════
  {
    sku: 'CLM-20-SET',
    title: 'Крепление трубное 1×20 сборное',
    category: 'clamp', usage: 'internal', diameter: 20,
    spec: 'Сборное · 2 части · под гвоздь или дюбель',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 3,
  },
  {
    sku: 'CLM-25-SET',
    title: 'Крепление трубное 1×25 сборное',
    category: 'clamp', usage: 'internal', diameter: 25,
    spec: 'Сборное · 2 части · под гвоздь или дюбель',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 3,
  },
  {
    sku: 'CLM-32-SET',
    title: 'Крепление трубное 1×32 сборное',
    category: 'clamp', usage: 'internal', diameter: 32,
    spec: 'Сборное · 2 части · под гвоздь или дюбель',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 6,
  },
  {
    sku: 'CLM-20',
    title: 'Хомут Ø20 одиночный',
    category: 'clamp', usage: 'internal', diameter: 20,
    spec: 'Одиночный · с дюбелем',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 3,
  },
  {
    sku: 'CLM-25',
    title: 'Хомут Ø25 одиночный',
    category: 'clamp', usage: 'internal', diameter: 25,
    spec: 'Одиночный · с дюбелем',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 3,
  },
  {
    sku: 'CLM-32',
    title: 'Хомут Ø32 одиночный',
    category: 'clamp', usage: 'internal', diameter: 32,
    spec: 'Одиночный · с дюбелем',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 6,
  },
  {
    sku: 'CLM-50',
    title: 'Хомут обжимной Ø50',
    category: 'clamp', usage: 'internal', diameter: 50,
    spec: 'Обжимной · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 24,
  },
  {
    sku: 'CLM-110',
    title: 'Хомут обжимной Ø110',
    category: 'clamp', usage: 'internal', diameter: 110,
    spec: 'Обжимной · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 32,
  },

  // ══════════════════════════════════════════════════
  // СПЕЦЭЛЕМЕНТЫ
  // ══════════════════════════════════════════════════

  // Трапы сливные
  {
    sku: 'TRAP-50-90',
    title: 'Трап сливной Ø50 · 90°',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Боковой выпуск 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 74,
  },
  {
    sku: 'TRAP-50-PR',
    title: 'Трап сливной Ø50 прямой',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Прямой выпуск · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 68,
  },
  {
    sku: 'TRAP-110-90',
    title: 'Трап сливной Ø110 · 90°',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Боковой выпуск 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 199,
  },
  {
    sku: 'TRAP-110-PR',
    title: 'Трап сливной Ø110 прямой',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Прямой выпуск · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 137,
  },

  // АБУ (унитазный отвод)
  {
    sku: 'ABU-STR',
    title: 'АБУ прямой (унитазный патрубок)',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Прямой · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 105,
  },
  {
    sku: 'ABU-90',
    title: 'АБУ 90° (унитазный патрубок)',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Угол 90° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 105,
  },
  {
    sku: 'ABU-45',
    title: 'АБУ 45° (унитазный патрубок)',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Угол 45° · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 105,
  },

  // Грибки вентиляционные
  {
    sku: 'VENT-50',
    title: 'Грибок вентиляционный Ø50',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Вентиляционный выход · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 115,
  },
  {
    sku: 'VENT-110',
    title: 'Грибок вентиляционный Ø110',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Вентиляционный выход · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 191,
  },
  {
    sku: 'EXH-50',
    title: 'Грибок выхлопной Ø50 U',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Выхлопной · U-образный · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 91,
  },
  {
    sku: 'EXH-110',
    title: 'Грибок выхлопной Ø110 U',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Выхлопной · U-образный · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 149,
  },

  // Патрубки компенсационные
  {
    sku: 'PAT-50',
    title: 'Патрубок компенсационный Ø50',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Компенсационный · телескопический · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 43,
  },
  {
    sku: 'PAT-110',
    title: 'Патрубок компенсационный Ø110',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Компенсационный · телескопический · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 92,
  },

  // Манжеты уплотнительные
  {
    sku: 'MAN-32',
    title: 'Манжета уплотнительная Ø32',
    category: 'special', usage: 'internal', diameter: 32,
    spec: 'Резиновое уплотнительное кольцо · EPDM',
    material: 'Резина (EPDM)', availability: 'check', unit: 'шт',
    priceRetail: 2,
  },
  {
    sku: 'MAN-40',
    title: 'Манжета уплотнительная Ø40',
    category: 'special', usage: 'internal', diameter: 40,
    spec: 'Резиновое уплотнительное кольцо · EPDM',
    material: 'Резина (EPDM)', availability: 'check', unit: 'шт',
    priceRetail: 2,
  },
  {
    sku: 'MAN-50',
    title: 'Манжета уплотнительная Ø50',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Резиновое уплотнительное кольцо · EPDM',
    material: 'Резина (EPDM)', availability: 'check', unit: 'шт',
    priceRetail: 3,
  },
  {
    sku: 'MAN-110',
    title: 'Манжета уплотнительная Ø110',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Резиновое уплотнительное кольцо · EPDM',
    material: 'Резина (EPDM)', availability: 'check', unit: 'шт',
    priceRetail: 5,
  },

  // Переходники чугун/пластик
  {
    sku: 'CAST-50',
    title: 'Переходник чугун/пластик Ø50',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'Без резинового уплотнения · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 26,
  },
  {
    sku: 'CAST-110',
    title: 'Переходник чугун/пластик Ø110',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'Без резинового уплотнения · ПП',
    material: 'Полипропилен', availability: 'check', unit: 'шт',
    priceRetail: 36,
  },
  {
    sku: 'SEAL-50',
    title: 'Уплотнение чугун/пластик Ø50',
    category: 'special', usage: 'internal', diameter: 50,
    spec: 'С резиновой манжетой · ПП',
    material: 'Полипропилен + Резина', availability: 'check', unit: 'шт',
    priceRetail: 16,
  },
  {
    sku: 'SEAL-110',
    title: 'Уплотнение чугун/пластик Ø110',
    category: 'special', usage: 'internal', diameter: 110,
    spec: 'С резиновой манжетой · ПП',
    material: 'Полипропилен + Резина', availability: 'check', unit: 'шт',
    priceRetail: 28,
  },
];
