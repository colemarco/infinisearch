import Fuse from "fuse.js";
import { getElementsData } from "./loadElementsData.js";

// In your component:
const elements = await getElementsData();

// Configure Fuse options
const fuseOptions = {
    keys: ["name"], // Search only the name field
    threshold: 0.05, // Lower threshold = more strict matching
    includeScore: true,
};

// Initialize Fuse with your data
const fuse = new Fuse(elements, fuseOptions);

// Function that powers the search bar
export async function getSearchResults(keyword, limit) {
    return fuse.search(keyword, { limit: limit });
}
