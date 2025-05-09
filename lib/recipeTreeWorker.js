// Web Worker for calculating recipe tree layout
self.onmessage = (event) => {
  try {
    const { craftingTree } = event.data;
    if (!craftingTree) {
      self.postMessage({ error: 'No crafting tree provided' });
      return;
    }

    // Calculate node positions
    const positions = calculateNodePositions(craftingTree);
    self.postMessage({ positions });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

// Helper to find a node by ID in the tree
function findNodeById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;

  if (node.ingredients && Array.isArray(node.ingredients)) {
    for (const child of node.ingredients) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Calculate node size in pixels
function getNodeSizePixels(node, rootId) {
  if (!node || !node.name) return 60;

  const nameLength = node.name.length;

  if (node.id === rootId) {
    // Root node
    return Math.max(100, 80 + nameLength * 5);
  } else if (node.isBasic) {
    return Math.max(70, 60 + nameLength * 3.5);
  } else {
    return Math.max(80, 60 + nameLength * 4);
  }
}

// Calculate the tree dimensions and node sizes
function calculateTreeDimensions(node, rootId, level = 0) {
  if (!node) return { width: 0, height: 0, nodeCount: 0, maxDepth: level };

  // Calculate this node's size based on name length
  const nodeSize = getNodeSizePixels(node, rootId);

  // If it's a leaf node (no ingredients or empty array)
  if (
    !node.ingredients ||
    !Array.isArray(node.ingredients) ||
    node.ingredients.length === 0
  ) {
    return {
      width: nodeSize,
      height: nodeSize,
      nodeCount: 1,
      maxDepth: level,
    };
  }

  // Recursively calculate dimensions for all children
  const childDimensions = node.ingredients.map((child) =>
    calculateTreeDimensions(child, rootId, level + 1)
  );

  // Sum up the total width of all children
  const totalChildWidth = childDimensions.reduce(
    (sum, dim) => sum + dim.width,
    0
  );

  // Find the maximum depth in the subtree
  const maxChildDepth = Math.max(
    ...childDimensions.map((dim) => dim.maxDepth),
    level
  );

  // Count total nodes in the subtree
  const totalNodeCount =
    1 + childDimensions.reduce((sum, dim) => sum + dim.nodeCount, 0);

  // The node's subtree width is the max of its own width and its children's total width
  const subtreeWidth = Math.max(nodeSize, totalChildWidth);

  // Height is based on the deepest path
  const subtreeHeight =
    nodeSize + (maxChildDepth > level ? maxChildDepth - level : 0) * 150;

  return {
    width: subtreeWidth,
    height: subtreeHeight,
    nodeCount: totalNodeCount,
    maxDepth: maxChildDepth,
  };
}

// Calculate node positions
function calculateNodePositions(craftingTree) {
  if (!craftingTree) return {};

  const initialPositions = {};

  // Start at the center of our container
  // With real data, we need more space for potentially larger trees
  const centerX = 2500;
  const centerY = 300; // Start even higher up to give more space for potentially deeper trees

  // Calculate overall tree dimensions
  const treeDimensions = calculateTreeDimensions(craftingTree, craftingTree.id);

  // Position nodes based on calculated dimensions
  function positionNodes(
    node,
    x,
    y,
    availableWidth,
    level = 0,
    index = 0
  ) {
    if (!node) return;

    // Store this node's position
    const nodeId = node.id || `node-${level}-${index}`;
    initialPositions[nodeId] = { x, y };

    // If this is a leaf node, we're done
    if (
      !node.ingredients ||
      !Array.isArray(node.ingredients) ||
      node.ingredients.length === 0
    ) {
      return;
    }

    // Calculate vertical spacing - increases with depth for real data graphs
    // Use more vertical spacing for potentially deeper trees
    const verticalSpacing = 180 + level * 15;

    // Divide available width among children proportionally to their subtree sizes
    let childrenDimensions = node.ingredients.map((child) =>
      calculateTreeDimensions(child, craftingTree.id, level + 1)
    );

    // Calculate total width of all children
    const totalChildWidth = childrenDimensions.reduce(
      (sum, dim) => sum + dim.width,
      0
    );

    // Calculate a minimum spacing between siblings to ensure they don't crowd
    // Increase spacing for real data trees
    const minSiblingSpacing = 120; // Increased minimum spacing between siblings

    // Factor for width distribution - the larger this is, the more spread out nodes are
    // Use a larger distribution factor for real data
    const widthDistributionFactor = 2.0; // Increased for more spread-out layout

    // Total width including spacing
    const effectiveWidth = Math.max(
      availableWidth,
      totalChildWidth * widthDistributionFactor +
        (node.ingredients.length - 1) * minSiblingSpacing
    );

    // Start positioning from the left edge of the available space
    let currentX = x - effectiveWidth / 2;

    // Position each child
    node.ingredients.forEach((child, idx) => {
      if (!child) return;

      const childDim = childrenDimensions[idx];

      // Allocate width proportionally
      const childAvailableWidth =
        (childDim.width / totalChildWidth) * effectiveWidth;

      // Calculate child position
      const childX = currentX + childAvailableWidth / 2;
      const childY = y + verticalSpacing;

      // Recursively position the child and its subtree
      positionNodes(
        child,
        childX,
        childY,
        childAvailableWidth,
        level + 1,
        childDim.width,
        idx
      );

      // Move currentX for the next child
      currentX += childAvailableWidth;
    });
  }

  // Start positioning from the root
  positionNodes(craftingTree, centerX, centerY, treeDimensions.width);
  return initialPositions;
}