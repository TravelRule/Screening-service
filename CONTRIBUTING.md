# Contributing to Travel-Rule Screening Service

Thanks for your interest in contributing! This document covers how to get
started.

## Development Setup

```bash
git clone https://github.com/TravelRule/Screening-service.git
cd Screening-service
cp .env.example .env
npm install
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the production server |
| `npm run dev` | Start with file watching |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

## Architecture

This service runs in **DRY-RUN mode** by default (no generated Soroban
bindings). See `docs/ARCHITECTURE.md` for the full request lifecycle.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make your changes and ensure `npm run lint && npm test` pass.
3. Open a PR with a clear description of what changed and why.
4. Wait for CI to pass and for a maintainer review.

## Code Style

- We use ESLint + Prettier. Run `npm run format` before committing.
- Use double quotes, semicolons, and trailing commas.
