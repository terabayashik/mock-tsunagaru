# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Router v7 application with SSR disabled and prerendering enabled. It uses Mantine for UI components, TailwindCSS for styling, TypeScript, and Biome for linting/formatting. The project uses pnpm as the package manager.

## Development Commands

- `pnpm dev` - Start development server (available at http://localhost:5173)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm check` - Run Biome linting and formatting (auto-fixes issues)
- `pnpm typecheck` - Run TypeScript type checking (includes React Router typegen)

## Architecture

- **App Structure**: Single-page application (SPA) with prerendering
- **Routing**: Uses React Router v7 with file-based routing in `app/routes/`
- **UI Framework**: Mantine components with TailwindCSS for styling
- **Styling**: Global styles from Mantine, Inter font from Google Fonts
- **Type Safety**: Full TypeScript with strict configuration
- **Path Aliases**: `~/*` maps to `./app/*`

## Key Files

- `react-router.config.ts` - Router configuration (SSR disabled, prerendering enabled)
- `app/root.tsx` - Root layout with Mantine provider and error boundary
- `app/routes.ts` - Route definitions
- `biome.json` - Linter/formatter configuration with custom rules
- `tsconfig.json` - TypeScript configuration with React Router types

## Code Standards

- Use Biome for linting/formatting (runs on `pnpm check`)
- TypeScript strict mode enabled
- Line width: 120 characters
- Space indentation
- Organize imports automatically
- Use Mantine components over custom UI components
- Follow React Router v7 patterns for data loading and mutations

## Performance and Tooling

- Prioritize using faster alternative implemented with Rust. For example, fd, rg and sd.
- Use `fd` command instead of `find` command
- Use `sd` command instead of `sed` command