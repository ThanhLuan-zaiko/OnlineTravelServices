# Project Notes

## Overview

This is an online travel services web application.

Primary stack:

- Next.js fullstack app using the App Router under `app/`
- React with TypeScript
- Tailwind CSS v4
- Bun for package management and scripts
- TanStack Query, Axios, and Zustand are the intended client-side data stack
- ScyllaDB for persistence, with schema defined in `schema.cql`

## Common Commands

Use Bun commands by default:

- `bun dev` starts the Next.js development server
- `bun run build` builds the app
- `bun run lint` runs ESLint

## Database

- Main keyspace: `online_travel_services`
- Schema file: `schema.cql`
- Local reset/setup script: `reset_database.ps1`
- The schema is query-oriented for ScyllaDB and includes duplicated tables for lookup patterns.

When changing data access, prefer preserving ScyllaDB-friendly query patterns instead of introducing relational joins or ad hoc filtering over large partitions.

## Code Style

- Follow existing Next.js App Router conventions.
- Keep shared code under clear app-level folders when added, for example `lib/`, `components/`, `hooks/`, or `stores/`.
- Use TypeScript strictly and avoid weakening types unless there is a concrete integration boundary.
- Prefer Axios for HTTP client wrappers, TanStack Query for server-state caching, and Zustand for local UI/application state.
- Keep UI consistent with the existing Tailwind setup.

## Current State

The repository is still close to the initial `create-next-app` scaffold. At initialization time, `package.json` only declares Next.js, React, Tailwind, TypeScript, and ESLint packages, so TanStack Query, Axios, and Zustand may still need to be added before using them in code.
