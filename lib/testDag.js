import craftingDAG from '@/data/crafting_dag.json';

console.log('Loaded DAG file');
console.log('Nodes count:', craftingDAG.nodes?.length || 'No nodes found');
console.log('Relationships count:', craftingDAG.relationships?.length || 'No relationships found');

// Check for RESULTS_IN and PART_OF relationships
const resultsInRels = craftingDAG.relationships?.filter(rel => rel.type === 'RESULTS_IN') || [];
const partOfRels = craftingDAG.relationships?.filter(rel => rel.type === 'PART_OF') || [];

console.log('RESULTS_IN relationships:', resultsInRels.length);
console.log('PART_OF relationships:', partOfRels.length);

// Check a sample relationship if available
if (resultsInRels.length > 0) {
  console.log('Sample RESULTS_IN:', resultsInRels[0]);
}
if (partOfRels.length > 0) {
  console.log('Sample PART_OF:', partOfRels[0]);
}

// This will show what's going on with the import
console.log('DAG structure:', Object.keys(craftingDAG));
console.log('Is DAG valid?', Boolean(craftingDAG && craftingDAG.nodes && craftingDAG.relationships));

// Export a simple function to test if the import is working
export function testDag() {
  return Boolean(craftingDAG && craftingDAG.nodes && craftingDAG.relationships);
}