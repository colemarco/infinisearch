# InfiniSearch

A high-performance search interface for elements and crafting recipes built with Next.js, React, and Fuse.js.

## Features

- Fast, fuzzy search using Fuse.js
- Client-side CSV parsing with PapaParse
- Responsive UI with TailwindCSS
- TypeScript support

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data Files

The application uses two main data files:

- `data/elements.csv`: Contains element information for search functionality
- `data/crafting_dag.json`: Contains crafting recipe data

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run lint` - Run ESLint

## Technology Stack

- Next.js 15.2.4 (App Router)
- React 19
- TypeScript 5
- TailwindCSS 4
- Fuse.js for search
- PapaParse for CSV parsing
