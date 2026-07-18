# MAXPERFORM

**MPM™ | Max Perform Method** – prémiová tréningová webová aplikácia pre silový
a kondičný tréning. Sleduje tréningové plány, aktívne tréningy, históriu,
osobné rekordy a progres. Celé rozhranie je v slovenčine, optimalizované
primárne pre mobil (mobile-first, tmavý režim).

## Čo aplikácia robí

- **Prehľad (dashboard)** – dnešný odporúčaný tréning, hlavný ring týždenného
  cieľa tréningov, séria aktívnych dní, orientačný odhad kalórií, objem za
  30 dní, týždenná konzistentnosť, posledný tréning a ďalší krok.
- **Tréningové plány** – vytváranie a úprava tréningov: cviky, série,
  opakovania, hmotnosti, poznámky, voliteľná svalová partia, zmena poradia
  cvikov.
- **Aktívny tréning** – uplynutý čas, odškrtávanie sérií, úprava váh
  a opakovaní počas tréningu, automatický časovač odpočinku, súhrn
  s objemom, rekordmi a porovnaním s minulým tréningom.
- **História** – mesačný kalendár s odtrénovanými dňami a detail každého
  tréningu.
- **Časovač odpočinku** – predvoľby 30/60/90/120 s aj vlastný čas, pauza,
  reset, ±15 s, zvukové a vizuálne upozornenie; beží aj počas tréningu.
- **Progres** – grafy (recharts): porovnanie max. váhy alebo odhadu 1RM
  (Epleyho vzorec) až pre 3 cviky naraz, tréningový objem a počet tréningov
  po týždňoch, konzistentnosť, objem podľa svalovej partie, najčastejšie
  cviky.
- **Osobné rekordy** (`/records`) – pre každý cvik odhad 1RM, najťažšia séria
  a najväčší objem jednej série.
- **Zdieľanie programu odkazom + QR** – pri každom pláne „Zdieľať program":
  predpis plánu (bez histórie a nastavení) sa zabalí do URL fragmentu
  (gzip + base64url, nič sa neposiela na server) a vygeneruje sa QR kód.
  Príjemca na `/import` uvidí najprv náhľad a plán sa uloží až po potvrdení –
  import nikdy neprepíše existujúce plány (pri zhode názvu pridá sufix).
- **Zdieľateľná karta výsledku** – po dokončení tréningu „Zdieľať výsledok"
  vykreslí brandovaný obrázok (Instagram feed 1080×1350 / stories 1080×1920)
  natívnym canvasom; zdieľanie cez `navigator.share`, stiahnutie PNG alebo
  kopírovanie do schránky.
- **Nastavenia** – týždenný cieľ tréningov, predvolený odpočinok, zvuk,
  ukážkové dáta, export/import JSON, vymazanie všetkých dát.

> Odhad kalórií a 1RM sú iba orientačné (kalórie ~6 kcal/min silového
> tréningu, 1RM Epleyho vzorcom) a nejde o medicínsky presné ani zmerané
> hodnoty.

## Technológie

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) (tokeny v `@theme`, bez config súboru)
- [React Router 7](https://reactrouter.com/)
- [Framer Motion](https://motion.dev/) (rešpektuje `prefers-reduced-motion`)
- [Recharts](https://recharts.org/) – grafy (lenivo načítavané)
- [lucide-react](https://lucide.dev/) – ikony
- [qrcode](https://github.com/soldair/node-qrcode) – lokálne generovanie QR
  kódu na zdieľanie programu (žiadna externá služba)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) – manifest + service
  worker (offline app shell, inštalácia na plochu)

Zdieľateľná karta výsledku sa kreslí priamo v prehliadači cez `<canvas>` –
bez ďalšej knižnice a bez screenshotu DOM.

## PWA / offline

Appka je nainštalovateľná na plochu (Android aj iOS – „Pridať na plochu")
a po prvom načítaní funguje aj offline vďaka service workeru, ktorý
predkešuje statický obsah appky. Service worker sa aktivuje iba
v produkčnom builde (`npm run build` + `npm run preview`, alebo po deployi) –
vo vývojovom režime (`npm run dev`) beží appka bez neho.

## Ukladanie dát

**Všetky dáta sú uložené iba lokálne v prehliadači (localStorage)** – žiadny
backend, databáza ani účty. Z toho vyplýva:

- dáta sú viazané na konkrétny prehliadač a zariadenie,
- **vymazanie dát prehliadača (cookies/site data) odstráni aj všetky tréningy**,
- zálohou je export do JSON v Nastaveniach (a spätný import).

Dátový formát je verzovaný (aktuálne `version: 2`) kvôli budúcim migráciám;
načítanie ošetruje chýbajúce aj poškodené dáta a staré dáta bez novších polí
(napr. týždenný cieľ, svalová partia cviku) automaticky dostanú bezpečné
predvolené hodnoty.

## Požiadavky

- Node.js 20+
- npm 10+

## Spustenie

```bash
npm install        # inštalácia závislostí
npm run dev        # vývojový server (http://localhost:5173)
npm run build      # produkčný build do dist/
npm run preview    # lokálny náhľad produkčného buildu
npm run lint       # oxlint
```

## Deploy

Aplikácia je statická SPA – stačí zbuildovať a servírovať `dist/`.
SPA routing (obnovenie na podstránke) je vyriešený konfiguráciou nižšie.

### Vercel

1. Importuj repozitár na [vercel.com](https://vercel.com) (framework: Vite).
2. Build command `npm run build`, output `dist` (Vercel zvyčajne predvyplní).
3. Súbor `vercel.json` v repe presmerúva všetky cesty na `index.html`.

### Netlify

1. Importuj repozitár na [netlify.com](https://netlify.com).
2. Build command `npm run build`, publish directory `dist`.
3. Súbor `public/_redirects` (`/* /index.html 200`) rieši SPA routing.

## Štruktúra projektu

```
src/
  components/
    ui/        # Button, Card, Modal, NumberField, TextField, EmptyState…
    layout/    # AppLayout (spodná navigácia + sidebar), Logo
    dashboard/ # GoalRing, StatTile, WeekStrip
    workout/   # ActiveWorkoutBar, InlineStepper
    timer/     # RestTimerBar (plávajúci panel odpočinku)
    charts/    # zdieľaný vzhľad grafov + validovaná kategorická paleta
  pages/       # Dashboard, TrainingList, TrainingEditor, WorkoutActive,
               # History, HistoryDetail, Progress, Records, TimerPage, Settings
  state/       # AppContext (dáta + akcie), TimerContext, ToastContext
  storage/     # centralizovaná vrstva nad localStorage (verzia, sanitizácia,
               # export/import)
  data/        # deterministické demo dáta (označené ako Demo)
  types/       # TypeScript modely (plány, tréningy, história, preferencie)
  utils/       # výpočty (objem, streak, rekordy), formátovanie, id
```

Tréningový objem sa počíta ako **série × opakovania × hmotnosť** (súčet
dokončených sérií). Osobný rekord = najvyššia hmotnosť dokončenej série
daného cviku (pri zhode rozhoduje viac opakovaní). Séria aktívnych dní sa
počíta z reálne dokončených tréningov v histórii.
