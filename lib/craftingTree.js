// Real crafting tree generator based on the DAG data

// Cache to store loaded DAG data
let cachedDAGData = null;

// Enhanced cache with size limit to prevent memory issues
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.keys = [];
  }

  has(key) {
    return this.cache.has(key);
  }

  get(key) {
    if (!this.has(key)) return undefined;
    
    // Move to end of keys (most recently used)
    this.keys = this.keys.filter(k => k !== key);
    this.keys.push(key);
    
    return this.cache.get(key);
  }

  set(key, value) {
    // If key exists, update its position
    if (this.has(key)) {
      this.keys = this.keys.filter(k => k !== key);
    } 
    // If we're at capacity, remove least recently used
    else if (this.keys.length >= this.maxSize) {
      const lruKey = this.keys.shift();
      this.cache.delete(lruKey);
    }
    
    // Add/update the entry
    this.keys.push(key);
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
    this.keys = [];
  }
}

// Cache to store memoized recipe trees
const recipeCache = new LRUCache(50);

// Special handling for basic elements
const BASIC_ELEMENTS = ['Fire', 'Water', 'Earth', 'Wind'];

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Generate a unique ID for a given name
 * @param {string} baseName - Base name to create ID from
 * @returns {string} Unique ID
 */
function generateUniqueId(baseName) {
  idCounter++;
  return `${baseName.toLowerCase().replace(/\s+/g, '-')}-${idCounter}`;
}

/**
 * Loads the crafting DAG data from the JSON file
 * @returns {Promise<Object>} The parsed DAG data
 */
async function loadDAGData() {
  if (cachedDAGData) return cachedDAGData;
  
  try {
    const response = await fetch('/data/crafting_dag.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch crafting DAG: ${response.status}`);
    }
    
    const data = await response.json();
    cachedDAGData = data;
    
    // Process data for faster lookups
    processDAGData(cachedDAGData);
    
    return cachedDAGData;
  } catch (error) {
    console.error('Error loading crafting DAG:', error);
    // Return a minimal valid structure if we can't load the real data
    return { nodes: [], relationships: [] };
  }
}

// Maps to efficiently lookup nodes and relationships
const nodeMap = new Map();
const edgeMap = new Map();
const recipeResults = new Map(); // element id -> resulting recipes
const recipeIngredients = new Map(); // element id -> required ingredients

/**
 * Process the DAG data to create efficient lookup structures
 * @param {Object} data - The DAG data
 */
function processDAGData(data) {
  // Build node map (id -> node)
  data.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  // Extract recipe information from relationships
  data.relationships.forEach(rel => {
    // Track the pair nodes and recipe results
    if (rel.type === 'PART_OF') {
      // This is an ingredient going into a pair
      const pairId = rel.end;
      const ingredientId = rel.start;
      
      if (!edgeMap.has(pairId)) {
        edgeMap.set(pairId, []);
      }
      edgeMap.get(pairId).push(ingredientId);
    } 
    else if (rel.type === 'RESULTS_IN') {
      // This is a pair resulting in an element
      const pairId = rel.start;
      const resultId = rel.end;
      
      // Map the result to its pair
      if (!recipeResults.has(resultId)) {
        recipeResults.set(resultId, []);
      }
      recipeResults.get(resultId).push(pairId);
      
      // Also create a reverse mapping from pair to result
      edgeMap.set(`result_${pairId}`, resultId);
    }
  });
  
  // Create a mapping of elements to their direct ingredient pairs
  nodeMap.forEach((node, nodeId) => {
    if (recipeResults.has(nodeId)) {
      // This element has recipes that produce it
      const pairs = recipeResults.get(nodeId);
      
      const allIngredientSets = [];
      
      // For each pair that produces this element
      pairs.forEach(pairId => {
        if (edgeMap.has(pairId)) {
          // Get the ingredients in this pair
          const ingredients = edgeMap.get(pairId);
          if (ingredients.length === 2) {
            allIngredientSets.push(ingredients);
          }
        }
      });
      
      recipeIngredients.set(nodeId, allIngredientSets);
    }
  });
}

/**
 * Maximum depth for complex trees to prevent performance issues
 */
const MAX_TREE_DEPTH = 6;

/**
 * Recursively builds a crafting tree for a given element with performance optimizations
 * @param {string} elementId - The ID of the element to build a tree for
 * @param {Set<string>} visited - Set of visited element IDs to prevent cycles
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum depth to build the tree to
 * @returns {Object|null} The crafting tree object or null if not found
 */
function buildTree(elementId, visited = new Set(), depth = 0, maxDepth = MAX_TREE_DEPTH) {
  // Performance optimization: Limit tree depth for complex recipes
  if (depth > maxDepth) {
    // Return a simplified node without recursing further
    const elementNode = nodeMap.get(elementId);
    if (!elementNode) return null;
    
    const elementName = elementNode.properties.name;
    return {
      id: generateUniqueId(elementName),
      name: elementName,
      isBasic: true, // Treat as basic when we hit max depth
      originalId: elementId,
      isDepthLimited: true // Mark as depth-limited for UI
    };
  }
  
  // Avoid cycles by checking if we've seen this element before
  if (visited.has(elementId)) {
    return null;
  }
  
  // Get the element node data
  const elementNode = nodeMap.get(elementId);
  if (!elementNode) {
    return null;
  }
  
  // Get the element name
  const elementName = elementNode.properties.name;
  
  // Mark this element as visited for this branch
  visited.add(elementId);
  
  // Check if this element is a basic element
  const isBasic = BASIC_ELEMENTS.includes(elementName) || 
                  elementNode.properties.depth === 0;
  
  // If this is a basic element or has no ingredients, return a simple node
  if (isBasic || !recipeIngredients.has(elementId)) {
    visited.delete(elementId); // Remove from visited set for other branches
    return {
      id: generateUniqueId(elementName),
      name: elementName,
      isBasic: isBasic,
      originalId: elementId
    };
  }
  
  // Get ingredient sets - there might be multiple recipes for the same result
  const ingredientSets = recipeIngredients.get(elementId);
  
  if (ingredientSets && ingredientSets.length > 0) {
    // Use an array to track the best recipe found
    let bestIngredients = [];
    
    // Try each recipe and keep the one with most ingredients
    for (const ingredientSet of ingredientSets) {
      // For performance reasons, only process the first few recipes if there are many
      if (ingredientSets.length > 5 && ingredientSets.indexOf(ingredientSet) >= 3) {
        break;
      }
      
      // Recursively build trees for each ingredient with a new visited set
      const childTrees = ingredientSet
        .map(ingredientId => buildTree(ingredientId, new Set(visited), depth + 1, maxDepth))
        .filter(Boolean); // Remove any null results
      
      // If this recipe gives more resolvable ingredients, use it instead
      if (childTrees.length > bestIngredients.length) {
        bestIngredients = childTrees;
      }
      
      // If we found a recipe with both ingredients, we can stop searching
      if (childTrees.length === 2) {
        break;
      }
    }
    
    // If we found any recipe with ingredients, use it
    if (bestIngredients.length > 0) {
      // Remove from visited set for other branches
      visited.delete(elementId);
      
      // Return the tree with its ingredients
      return {
        id: generateUniqueId(elementName),
        name: elementName,
        isBasic: false,
        originalId: elementId,
        ingredients: bestIngredients
      };
    }
  }
  
  // Remove from visited set for other branches
  visited.delete(elementId);
  
  // If we get here, this element exists but has no recipe
  return {
    id: generateUniqueId(elementName),
    name: elementName,
    isBasic: true, // Treat as basic if no recipe found
    originalId: elementId
  };
}

/**
 * Find an element node by name
 * @param {string} name - Element name to find
 * @returns {Object|null} The element node or null if not found
 */
function findElementByName(name) {
  for (const node of nodeMap.values()) {
    if (node.properties.name === name) {
      return node;
    }
  }
  return null;
}

/**
 * Builds a complete crafting tree for a given element name
 * @param {string} targetName - Name of the element to build a tree for
 * @returns {Object} The crafting tree object
 */
export async function buildCraftingTree(targetName) {
  // Reset ID counter for each new tree
  idCounter = 0;
  
  // First, ensure DAG data is loaded
  await loadDAGData();
  
  // Check cache first
  const cacheKey = targetName.toLowerCase();
  if (recipeCache.has(cacheKey)) {
    return structuredClone(recipeCache.get(cacheKey)); // Return a deep clone to prevent modifications
  }
  
  // Find the element node by name
  const targetElement = findElementByName(targetName);
  
  if (!targetElement) {
    console.warn(`Element "${targetName}" not found in the DAG.`);
    // Return a fallback for unknown elements
    return {
      id: "unknown-" + generateUniqueId(targetName),
      name: targetName,
      isBasic: true,
      ingredients: []
    };
  }
  
  // Build the tree starting from this element
  const tree = buildTree(targetElement.id);
  
  // If tree building failed, return a basic element
  if (!tree) {
    return {
      id: "basic-" + generateUniqueId(targetName),
      name: targetName,
      isBasic: true,
      ingredients: []
    };
  }
  
  // Cache the result (store a deep clone to prevent modifications)
  recipeCache.set(cacheKey, structuredClone(tree));
  
  return tree;
}

// Add an export for testing/debugging purposes
export const DAGUtils = {
  loadDAGData,
  findElementByName,
  nodeMap,
  recipeIngredients,
  recipeResults
};