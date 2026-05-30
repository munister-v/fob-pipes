# ДОНПОЛИМЕР — фронтенд (Angular)

Демонстрационный B2B-фронтенд производителя пластиковых труб и фитингов для
внутренней и наружной канализации (Донецк). Catalog-first структура, заявки
вместо корзины, без онлайн-оплаты. Визуальный язык вдохновлён Q Industrial:
холодная industrial-эстетика, крупная строгая типографика, светло-серый фон
`#E6E6E6`, красный акцент `#CA0000`, тонкие линии и строгая сетка.

## Стек

- Angular 17 (standalone components, signals, OnPush)
- TypeScript, SCSS
- Mock-данные, без бэкенда
- Responsive layout

## Запуск

```bash
npm install
npm start        # http://localhost:4200
```

Сборка:

```bash
npm run build
```

## Структура

```
src/app/
  components/      header, hero, categories, catalog, product-card,
                   quote, production, timeline, certificates, contacts, footer
  data/            catalog.data.ts        — mock-каталог
  models/          product.model.ts       — доменные типы
  services/        catalog.service.ts     — доступ к каталогу
                   quote.service.ts       — «собрать заявку» (signals)
                   locale.service.ts      — задел под i18n + валюты
  shared/          reveal.directive.ts    — scroll-reveal анимации
```

## Секции

Sticky header → hero → категории → каталог с фильтрами → карточки товаров →
«собрать заявку» → производство и история → timeline → сертификаты →
контакты → footer с SEO-текстом.

## Заявка

«Собрать заявку» заменяет корзину: позиции + количество, имя, телефон,
город/район, комментарий, тип клиента (частный / магазин / строительный
объект / другое). После отправки показывается подтверждение. Реальной отправки
нет — см. `quote.service.ts`:

```ts
// TODO: send quote to backend -> Telegram bot + email duplicate + optional 1C export
```

## Задел на будущее

- **i18n** (ru / uk / en) и **смена валюты** (RUB / UAH / USD) —
  `services/locale.service.ts`, состояние на signals, готово к подключению
  ngx-translate / Angular i18n и источника курсов.
- **Интеграции**: Telegram-бот, дублирование на email, экспорт в 1С —
  точка входа `QuoteService.submit()`.
- Каталог отдаётся через `CatalogService` — мок легко заменить на HTTP.
