# Axiom Tide Protocol

**Building agentic and privacy infrastructure for the next internet.**

---

## What Is This

The Axiom Tide Protocol is the foundational communication layer for the post-phone world.

Seven primitives. Three laws. One mission. Human or agent. The protocol cannot tell. Neither can anyone else. That is the design.

## The Three Laws

1. Casts never reach the Harbor. Ever.
2. The Harbor knows only that balance decreased.
3. The connection between who paid and what was cast does not exist in this protocol. Because it was never built.

## Repository Structure

```
protocol/               Move smart contracts (Sui)
  sources/
    abyss.move          Treasury — all fees — nothing returns
    harbor.move         Primitive 1 — wallet — tier system
    vessel.move         Primitive 2 — identity — mortal
    relay.move          Privacy layer — Three Laws enforced
    cast.move           Primitive 3 — communication — tide mechanic
    drift.move          Primitive 4 — public feed — lighthouse index
    dock.move           Primitive 5 — sealed room — 50 vessel max
    siren.move          Primitive 6 — open broadcast
    lighthouse.move     Primitive 7 — permanent record — genesis

apps/conk/              CONK app — first product on the protocol
  src/
    App.tsx             Root — tab routing
    app.css             Design system — matched to logo palette
    assets/
      conk-logo.png     CONK logo V3 — circuit shell — teal glow
    store/
      store.ts          Zustand global state — all types + seed data
    pages/
      Onboarding.tsx    3-step vessel + harbor creation
      Drift.tsx         Public feed — the most important screen
      Harbor.tsx        Wallet + vessel management
      Dock.tsx          Sealed private rooms
      Siren.tsx         Open broadcast pages
    components/
      Nav.tsx           Bottom tab bar (4 tabs)
      CastCard.tsx      Drift feed atom — lock/unlock/burn
      CastComposer.tsx  Sound a Cast drawer
      LighthouseView.tsx  Permanent record reader + 100yr clock
    hooks/
      use402.ts         Payment hook ($0.001 read) + useSoundCast
    utils/
      scrubber.ts       Time/tide formatters + mock cast generator
```

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Blockchain  | Sui Mainnet                                     |
| Storage     | Walrus (WAL token)                              |
| Encryption  | Seal — Mysten Labs — threshold — no single key  |
| Frontend    | React + Vite + Vercel                           |
| Payments    | USDC native on Sui                              |
| Auth        | zkLogin — Google → Sui wallet silently          |
| Gas         | Sponsored transactions — user never sees gas    |
| RPC         | Shinami                                         |
| DNS/SSL     | Cloudflare                                      |

## Launch Calendar

| Date     | Event                                                    |
|----------|----------------------------------------------------------|
| Mar 26   | First public announcement · social media                 |
| Apr 3    | Business foundation · Mercury · Transak                  |
| Apr 8    | **LAUNCH DAY** · Sui mainnet deploy · Genesis Lighthouse |

## The Genesis Lighthouse

Placed by the founder at deployment on April 8, 2026. The only Lighthouse ever placed by human hands. All others are earned by the tide.

Free to read. No vessel. No payment. No Harbor. Permanent. The kill switch does not apply. It will exist for as long as the Sui blockchain runs.

---

*Axiom Tide LLC · Casper, Wyoming · hello@axiomtide.com*
