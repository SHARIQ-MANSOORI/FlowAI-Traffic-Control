# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Real-time**: Socket.io (server + client)
- **Database**: PostgreSQL + Drizzle ORM (provisioned but not used by current app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + Framer Motion

## Application: FlowAI Lite

A smart traffic signal simulation system with:
- 4-road intersection visualization (North, South, East, West)
- Real-time traffic light cycling (green → yellow → red) via Socket.io
- Emergency ambulance green corridor mode
- Dynamic vehicle count simulation
- Dark cyberpunk-style UI

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + Socket.io + Traffic Engine
│   └── flowai-lite/        # React frontend (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`).
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server + Socket.io. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation.

- Entry: `src/index.ts` — creates HTTP server, attaches Socket.io, starts traffic engine
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
  - `health.ts` — `GET /api/healthz`
  - `traffic.ts` — `GET /api/traffic/state`, `POST /api/traffic/emergency`, `POST /api/traffic/reset`
- Traffic Engine: `src/lib/trafficEngine.ts` — manages signal cycling, emergency mode, vehicle simulation, broadcasts via Socket.io
- Paths served: `/api` and `/socket.io`
- Depends on: `@workspace/api-zod`

### `artifacts/flowai-lite` (`@workspace/flowai-lite`)

React + Vite frontend served at `/`.

- Uses `@workspace/api-client-react` for REST hooks
- Uses `socket.io-client` for real-time traffic updates
- `src/hooks/use-traffic-socket.ts` — connects to socket, updates React Query cache on `trafficUpdate`
- `src/components/intersection.tsx` — 4-road intersection visualization
- `src/components/traffic-light.tsx` — individual traffic signal component
- `src/components/control-panel.tsx` — emergency EVAC controls
- `src/components/stats-panel.tsx` — system telemetry sidebar

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec with traffic signal endpoints and types.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks from the OpenAPI spec.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Not actively used by FlowAI Lite (no persistent data needed).
