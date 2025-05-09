# InfiniSearch

A high-performance search interface for elements and crafting recipes built with Next.js, React, and Fuse.js.

## Features

- Fuzzy search using Fuse.js
- TailwindCSS for UI styling
- TypeScript support

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Inner Workings

InfiniSearch provides a modern, fast, and intuitive interface for exploring crafting recipes inspired by Neal.fun's infinite crafting concept. Think of it as a search engine for recipes - letting users quickly find how to create any element and visualize the ingredient paths needed to craft it.

### Core Components

#### Search System

At the heart of InfiniSearch is the SearchBar component (`components/searchBar.js`), which implements a macOS Spotlight-style search interface. The search system loads element data from CSV files using PapaParse and utilizes Fuse.js to provide lightning-fast fuzzy searching with intelligent ranking algorithms. This allows users to find elements even with partial or slightly misspelled queries.

The search interface manages its own state, including the current search term, results display, and selection handling. To maintain performance during rapid typing, it implements debounced searching that prevents excessive processing while the user is still entering their query.

#### Recipe Visualization

The RecipeFrame component (`components/recipeFrame.js`) creates an interactive canvas for visualizing crafting recipes. It displays a dynamic, draggable graph showing the selected element and all ingredients required to create it. The visualization supports intuitive interactions like panning, zooming, and node dragging, with smoothly scaling grid backgrounds that respond to the current zoom level.

To ensure the interface remains responsive even when rendering complex recipes with many ingredients, RecipeFrame uses Web Workers for layout calculations. This moves the computationally intensive task of positioning nodes to a background thread, preventing UI freezing and providing a smooth user experience.

Within the recipe visualization, each element is represented by an ElementNode component that enables intuitive interactions. These nodes feature drag-and-drop behavior for rearranging the view, and implement smart click detection that distinguishes between clicks and drags. For complex recipes, depth-limited nodes display visual cues indicating they can be clicked to explore their full recipes in a separate view.

#### Recipe Generation

The core algorithm for generating recipe trees lives in the Crafting Tree Builder (`lib/craftingTree.js`). This sophisticated system builds a tree structure showing how to craft any selected element using the available recipes data. It implements an efficient tree-building algorithm with cycle detection to prevent infinite loops, and uses depth limiting for complex recipes to maintain performance.

For elements with multiple possible crafting paths, the system employs intelligent recipe selection to find the best available path based on completeness and ingredient availability. To optimize performance when users revisit elements, it implements a Least Recently Used (LRU) caching strategy that speeds up repeated lookups while efficiently managing memory usage.

The recipe generation system handles basic elements (those that cannot be crafted from other elements) and compound elements differently, providing appropriate representations for each in the final visualization.

### How it Works

When a user interacts with InfiniSearch, they begin by typing an element name in the search bar. As they type, Fuse.js performs fuzzy matching in real-time to find and display relevant matches, ranked by relevance. Once the user selects an element from the results, the application initiates the recipe generation process.

Behind the scenes, the system loads the crafting relationship data and calls the `buildCraftingTree` function for the selected element. This function recursively builds a tree structure representing the complete recipe, showing all ingredients and their relationships. To handle extremely complex recipes, the system implements a depth limit that prevents excessive recursion while allowing users to explore deeper branches by clicking on depth-limited nodes.

The resulting recipe tree is cached for future lookups and passed to the visualization component. The RecipeFrame then calculates optimal positions for each node using a Web Worker to maintain UI responsiveness. Users can then explore the recipe by dragging nodes, zooming in and out, and clicking on depth-limited nodes to navigate to their full recipes.

Web Workers handle layout calculations in the background, recipe depth limiting manages complexity, LRU caching speeds up repeated element lookups, and staged rendering maintains UI responsiveness. The search interface uses smart debouncing to prevent performance issues during rapid typing.

## Challenges
It was somewhat complicated making all these different technologies work together for a performant app, but it worked out in the end. Making the recipeFrame component was **by far** the longest part of this project. The infinite scrolling, the infinite zoom grid, etc. Getting the recipe data in the first place was difficult: I first developed my own selenium based web scraper to play the game automatically, but then found a relational database containing element, and combinations data. I loaded that data into AuraDB to leverage a graph database for this application.

## Technology Stack

- Next.js 15.2.4 (App Router)
- React 19
- TypeScript 5
- TailwindCSS 4
- Fuse.js for search
