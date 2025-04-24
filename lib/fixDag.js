import fs from 'fs';
import path from 'path';

// Read the crafting_dag.json file
const dagPath = path.join(process.cwd(), 'data', 'crafting_dag.json');
console.log(`Reading DAG file from: ${dagPath}`);

try {
  // Read the file
  const dagData = fs.readFileSync(dagPath, 'utf8');
  
  // Parse the JSON
  let dag;
  try {
    dag = JSON.parse(dagData);
    console.log('Successfully parsed DAG JSON');
  } catch (parseError) {
    console.error('Error parsing DAG JSON:', parseError);
    process.exit(1);
  }
  
  // Validate structure
  if (!dag.nodes || !Array.isArray(dag.nodes)) {
    console.error('DAG missing nodes array or nodes is not an array');
    process.exit(1);
  }
  
  if (!dag.relationships || !Array.isArray(dag.relationships)) {
    console.error('DAG missing relationships array or relationships is not an array');
    
    // If it's missing relationships, let's add an empty array
    dag.relationships = [];
    console.log('Added empty relationships array');
  }
  
  console.log(`DAG contains ${dag.nodes.length} nodes and ${dag.relationships.length} relationships`);
  
  // Check for sample nodes
  if (dag.nodes.length > 0) {
    console.log('Sample node:', dag.nodes[0]);
  }
  
  // Check for sample relationships
  if (dag.relationships.length > 0) {
    console.log('Sample relationship:', dag.relationships[0]);
  } else {
    console.log('No relationships found in DAG');
  }
  
  // Validate node structure
  const validNodes = dag.nodes.filter(node => 
    node.id && 
    node.labels && Array.isArray(node.labels) &&
    node.properties && node.properties.name && node.properties.depth !== undefined
  );
  
  console.log(`Valid nodes: ${validNodes.length} / ${dag.nodes.length}`);
  
  if (validNodes.length < dag.nodes.length) {
    console.log('Found invalid nodes. First invalid node:', 
      dag.nodes.find(node => 
        !node.id || 
        !node.labels || !Array.isArray(node.labels) ||
        !node.properties || !node.properties.name || node.properties.depth === undefined
      )
    );
  }
  
  // Check for RESULTS_IN and PART_OF relationships
  const resultsInRels = dag.relationships.filter(rel => rel.type === 'RESULTS_IN');
  const partOfRels = dag.relationships.filter(rel => rel.type === 'PART_OF');
  
  console.log(`RESULTS_IN relationships: ${resultsInRels.length}`);
  console.log(`PART_OF relationships: ${partOfRels.length}`);
  
  // Quick test to build a crafting tree
  function findElementByName(elements, targetName) {
    return Object.keys(elements).find(
      (id) => elements[id].name.toLowerCase() === targetName.toLowerCase()
    );
  }
  
  // Organize elements
  const elements = {};
  for (const node of dag.nodes) {
    if (node.labels.includes("Element")) {
      elements[node.id] = {
        name: node.properties.name,
        depth: node.properties.depth,
      };
    }
  }
  
  // Try to find some common elements
  const elementNames = ['Fire', 'Water', 'Earth', 'Air', 'Steam', 'Lava'];
  for (const name of elementNames) {
    const id = findElementByName(elements, name);
    console.log(`Element "${name}": ${id ? `Found with ID ${id}` : 'Not found'}`);
  }
  
  // Map pairs to resulting element
  const pairsToResults = {};
  for (const rel of dag.relationships) {
    if (rel.type === "RESULTS_IN") {
      pairsToResults[rel.start] = rel.end;
    }
  }
  
  // Map which elements are part of which pair
  const pairIngredients = {};
  for (const rel of dag.relationships) {
    if (rel.type === "PART_OF") {
      if (!pairIngredients[rel.end]) {
        pairIngredients[rel.end] = [];
      }
      pairIngredients[rel.end].push(rel.start);
    }
  }
  
  // Build a lookup of crafting recipes: result -> [ingredient1, ingredient2]
  const craftingRecipes = {};
  for (const [pairId, ingredients] of Object.entries(pairIngredients)) {
    if (ingredients.length === 2 && pairsToResults[pairId]) {
      const resultId = pairsToResults[pairId];
      craftingRecipes[resultId] = ingredients;
    }
  }
  
  console.log(`Built ${Object.keys(craftingRecipes).length} crafting recipes`);
  
  // Check if we have recipes
  if (Object.keys(craftingRecipes).length > 0) {
    const sampleRecipeId = Object.keys(craftingRecipes)[0];
    const result = elements[sampleRecipeId];
    const ingredients = craftingRecipes[sampleRecipeId].map(id => elements[id]);
    
    console.log('Sample recipe:');
    console.log(`Result: ${result?.name} (${sampleRecipeId})`);
    console.log('Ingredients:', ingredients.map(ing => ing?.name).join(' + '));
  } else {
    console.log('No crafting recipes found. The DAG may be missing relationship data.');
    
    // Create test data for developing the UI
    console.log('Creating test crafting data for development...');
    
    // Add some test relationships
    // Find Fire, Water, Earth IDs
    const fireId = findElementByName(elements, 'Fire');
    const waterId = findElementByName(elements, 'Water');
    const earthId = findElementByName(elements, 'Earth');
    
    if (fireId && waterId) {
      // Create a pair node
      const steamPairId = 'pair_steam';
      const steamId = findElementByName(elements, 'Steam');
      
      if (steamId) {
        // Add PART_OF relationships for Fire and Water
        dag.relationships.push({
          id: 'rel_fire_steam',
          type: 'PART_OF',
          start: fireId,
          end: steamPairId,
          properties: {}
        });
        
        dag.relationships.push({
          id: 'rel_water_steam',
          type: 'PART_OF',
          start: waterId,
          end: steamPairId,
          properties: {}
        });
        
        // Add RESULTS_IN relationship for Steam
        dag.relationships.push({
          id: 'rel_pair_steam',
          type: 'RESULTS_IN',
          start: steamPairId,
          end: steamId,
          properties: {}
        });
        
        console.log('Added test relationship: Fire + Water = Steam');
      }
    }
    
    if (fireId && earthId) {
      // Create a pair node
      const lavaPairId = 'pair_lava';
      const lavaId = findElementByName(elements, 'Lava');
      
      if (lavaId) {
        // Add PART_OF relationships for Fire and Earth
        dag.relationships.push({
          id: 'rel_fire_lava',
          type: 'PART_OF',
          start: fireId,
          end: lavaPairId,
          properties: {}
        });
        
        dag.relationships.push({
          id: 'rel_earth_lava',
          type: 'PART_OF',
          start: earthId,
          end: lavaPairId,
          properties: {}
        });
        
        // Add RESULTS_IN relationship for Lava
        dag.relationships.push({
          id: 'rel_pair_lava',
          type: 'RESULTS_IN',
          start: lavaPairId,
          end: lavaId,
          properties: {}
        });
        
        console.log('Added test relationship: Fire + Earth = Lava');
      }
    }
    
    // Write the updated DAG back to file
    fs.writeFileSync(dagPath, JSON.stringify(dag, null, 2));
    console.log(`Updated DAG file with ${dag.relationships.length} relationships`);
    
    // Copy to public directory
    const publicDagPath = path.join(process.cwd(), 'public', 'data', 'crafting_dag.json');
    fs.writeFileSync(publicDagPath, JSON.stringify(dag, null, 2));
    console.log(`Copied updated DAG to public directory: ${publicDagPath}`);
  }
  
} catch (error) {
  console.error('Error processing DAG file:', error);
}