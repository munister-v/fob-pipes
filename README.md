# ООО «Ф.О.Б» — Производитель труб и фитингов

Angular 17 standalone site for **ООО «Ф.О.Б»** — manufacturer of plastic sewage pipes and fittings (brands «Юнипласт» / «Ф.О.Б», Donetsk, est. 1998).

**Live:** https://munister.com.ua/fob/

## Stack

- Angular 17, standalone components, signals
- SCSS, no UI library
- ChangeDetectionStrategy.OnPush throughout
- Mock catalog data (ready for backend / 1C integration)

## Dev

```bash
npm install
ng serve          # http://localhost:4200
```

## Deploy

```bash
ng build --base-href=/fob/
cp -R dist/donpipe-front/browser/. ~/munister-v.github.io/fob/
cd ~/munister-v.github.io && git add fob/ && git commit -m "fob: update" && git push
```

## Structure

```
src/app/
  components/   # hero, header, catalog, categories, quote, production, gallery,
                #  services, timeline, certificates, contacts, footer, product-card
  data/         # catalog.data.ts — mock products (200+ positions planned)
  models/       # product.model.ts
  services/     # catalog.service.ts, quote.service.ts, locale.service.ts
  shared/       # reveal.directive.ts, count-up.directive.ts
```
