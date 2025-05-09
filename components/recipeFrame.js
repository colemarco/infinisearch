"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { buildCraftingTree } from "@/lib/craftingTree";

/**
 * RecipeFrame component for displaying recipe information
 * @param {Object} props - Component props
 * @param {Object} props.selectedItem - The selected item containing id and name
 * @param {Function} props.onElementSelect - Callback when a node is clicked to select a new element
 * @returns {JSX.Element} RecipeFrame component
 */
export default function RecipeFrame({ selectedItem, onElementSelect }) {
    const [craftingTree, setCraftingTree] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scale, setScale] = useState(1);
    const transformRef = useRef(null);
    const [renderComplete, setRenderComplete] = useState(false);
    
    // Prevent UI from freezing by showing loading indicator first and 
    // deferring actual rendering until after the initial layout
    const [isReady, setIsReady] = useState(false);

    // Create a global reference to the current scale that can be accessed by child components
    if (typeof window !== "undefined") {
        window.currentZoomScale = scale;
    }

    // Load the crafting tree when the selected item changes
    useEffect(() => {
        if (!selectedItem) return;

        // Reset states when selection changes
        setLoading(true);
        setRenderComplete(false);
        setIsReady(false);
        setCraftingTree(null);

        // Use an async function to handle the tree building
        const loadTree = async () => {
            try {
                // Get the tree from our DAG-based function (now async)
                const tree = await buildCraftingTree(selectedItem.name);
                
                // Set the tree data but don't render it yet
                setCraftingTree(tree);
                
                // Delay actually showing the tree to allow the UI to remain responsive
                // This timeout allows the loading indicator to render
                setTimeout(() => {
                    setIsReady(true);
                    
                    // Reset the view with a slight delay to ensure components are ready
                    setTimeout(() => {
                        if (transformRef.current) {
                            transformRef.current.resetTransform();
                        }
                        // Mark rendering as complete
                        setRenderComplete(true);
                        setLoading(false);
                    }, 100);
                }, 50);
            } catch (error) {
                console.error("Error building crafting tree:", error);
                // Provide a fallback tree in case of errors
                setCraftingTree({
                    id: "error",
                    name: selectedItem.name,
                    isBasic: false,
                    ingredients: [
                        { id: "error1", name: "Element 1", isBasic: true },
                        { id: "error2", name: "Element 2", isBasic: true },
                    ],
                });
                setIsReady(true);
                setLoading(false);
            }
        };

        // Run the async function with a small delay to keep the UI responsive
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                loadTree();
            });
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [selectedItem]);

    // Function to update grid visibility based on scale
    const handleTransform = (ref) => {
        const newScale = ref.state.scale;
        setScale(newScale);
        // Update the global scale reference
        window.currentZoomScale = newScale;
    };

    if (!selectedItem) return null;

    // Calculate opacities for different grid levels based on scale
    const picoGridOpacity = scale > 8 ? Math.min((scale - 8) / 5, 1) : 0;
    const nanoGridOpacity = scale > 3 ? Math.min((scale - 3) / 3, 1) : 0;
    const microGridOpacity = scale > 1.5 ? Math.min((scale - 1.5) / 0.8, 1) : 0;
    const minorGridOpacity = scale > 0.5 ? 1 : Math.max(scale / 0.5, 0);
    const majorGridOpacity = scale < 1.5 ? 1 : 0;

    return (
        <div
            className="w-full rounded-xl overflow-hidden bg-[var(--search-bg)] backdrop-blur-md shadow-lg relative"
            style={{ height: "calc(100vh - 220px)" }}
        >
            {/* Element name chip in top left - outside transform to stay fixed */}
            <div className="absolute top-4 left-4 z-30 bg-white py-2 px-4 rounded-full shadow-md border border-gray-200 text-gray-700 font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                {selectedItem.name}
            </div>

            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <div className="animate-pulse">Loading recipe tree...</div>
                    <div className="text-xs opacity-70">
                        Building crafting tree from real data
                    </div>
                </div>
            ) : !craftingTree ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                    No recipe available for this element
                </div>
            ) : !isReady ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <div className="animate-pulse">Preparing recipe view...</div>
                    <div className="text-xs opacity-70">
                        Calculating layout for {craftingTree?.ingredients?.length || 0} ingredients
                    </div>
                </div>
            ) : (
                <TransformWrapper
                    ref={transformRef}
                    initialScale={0.2}
                    initialPositionX={0}
                    initialPositionY={0}
                    minScale={0.05}
                    maxScale={20}
                    limitToBounds={false}
                    onTransformed={handleTransform}
                    centerOnInit={true}
                    doubleClick={{ disabled: true }}
                    velocityAnimation={{ disabled: true }}
                    alignmentAnimation={{ disabled: true }}
                    wheel={{
                        step: 0.02, // Very small step for reduced sensitivity
                        wheelDisabled: false,
                        touchPadDisabled: false,
                        activationKeys: [],
                    }}
                    panning={{
                        disabled: false,
                        velocityDisabled: true,
                        lockAxisX: false,
                        lockAxisY: false,
                    }}
                    zoomAnimation={{ disabled: true }}
                    pinch={{ disabled: false }}
                    centerZoomedOut={false} // Important for cursor-centered zooming
                >
                    <TransformComponent
                        wrapperStyle={{
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            borderRadius: "0.75rem",
                            position: "relative",
                        }}
                        contentStyle={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "relative",
                            overflow: "visible",
                        }}
                        contentClass="recipe-canvas"
                    >
                        {/* Multi-layered grid system - as a background */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div
                                className="grid-layer grid-major absolute inset-0"
                                style={{ opacity: majorGridOpacity }}
                            />
                            <div
                                className="grid-layer grid-minor absolute inset-0"
                                style={{ opacity: minorGridOpacity }}
                            />
                            <div
                                className="grid-layer grid-micro absolute inset-0"
                                style={{ opacity: microGridOpacity }}
                            />
                            <div
                                className="grid-layer grid-nano absolute inset-0"
                                style={{ opacity: nanoGridOpacity }}
                            />
                            <div
                                className="grid-layer grid-pico absolute inset-0"
                                style={{ opacity: picoGridOpacity }}
                            />
                        </div>

                        {/* Centered content */}
                        <div
                            className="relative"
                            style={{
                                width: "5000px",
                                height: "5000px",
                                position: "relative",
                            }}
                        >
                            <DynamicRecipeTree 
                                craftingTree={craftingTree} 
                                onElementSelect={onElementSelect}
                            />
                        </div>
                    </TransformComponent>
                </TransformWrapper>
            )}
        </div>
    );
}

/**
 * Dynamic recipe tree that can handle trees of any depth
 */
function DynamicRecipeTree({ craftingTree, onElementSelect }) {
    // State to keep track of node positions
    const [nodePositions, setNodePositions] = useState({});
    const [renderComplete, setRenderComplete] = useState(false);
    const svgRef = useRef(null);

    // Helper to get node size in pixels
    const getNodeSizePixels = useCallback(
        (node) => {
            if (!node || !node.name) return 60;

            const nameLength = node.name.length;

            if (node.id === craftingTree?.id) {
                // Root node
                return Math.max(100, 80 + nameLength * 5);
            } else if (node.isBasic) {
                return Math.max(70, 60 + nameLength * 3.5);
            } else {
                return Math.max(80, 60 + nameLength * 4);
            }
        },
        [craftingTree]
    );

    // Helper to find a node by ID in the tree
    const findNodeById = useCallback((node, id) => {
        if (!node) return null;
        if (node.id === id) return node;

        if (node.ingredients && Array.isArray(node.ingredients)) {
            for (const child of node.ingredients) {
                const found = findNodeById(child, id);
                if (found) return found;
            }
        }

        return null;
    }, []);

    // Initialize node positions using a Web Worker to avoid blocking the main thread
    useEffect(() => {
        if (!craftingTree) return;
        
        // Reset states when tree changes
        setNodePositions({});
        setRenderComplete(false);
        
        // Only create the worker in browser environment
        if (typeof window !== 'undefined') {
            // Create a blob URL for the worker script
            const workerCode = `
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
                  const centerX = 2500;
                  const centerY = 300; // Start higher up to give more space for deeper trees

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
                    const nodeId = node.id || \`node-\${level}-\${index}\`;
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

                    // Calculate a minimum spacing between siblings
                    const minSiblingSpacing = 120; 

                    // Factor for width distribution
                    const widthDistributionFactor = 2.0;

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

                // Web Worker message handler
                onmessage = function(e) {
                  try {
                    const { craftingTree } = e.data;
                    const positions = calculateNodePositions(craftingTree);
                    postMessage({ positions });
                  } catch (error) {
                    postMessage({ error: error.message || 'Error calculating positions' });
                  }
                };
            `;
            
            // Create a blob with the worker code
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            // Create a worker
            const worker = new Worker(workerUrl);
            
            // Set up message handler
            worker.onmessage = (e) => {
                if (e.data.error) {
                    console.error('Worker error:', e.data.error);
                    // Provide a fallback positioning
                    const fallbackPositions = { [craftingTree.id]: { x: 2500, y: 300 } };
                    setNodePositions(fallbackPositions);
                } else {
                    setNodePositions(e.data.positions);
                    // Mark rendering as complete after positions are calculated
                    setTimeout(() => {
                        setRenderComplete(true);
                    }, 50);
                }
            };
            
            // Send the crafting tree to the worker for processing
            worker.postMessage({ craftingTree });
            
            // Clean up
            return () => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };
        } else {
            // Fallback for SSR
            setNodePositions({ [craftingTree.id]: { x: 2500, y: 300 } });
            setRenderComplete(true);
        }
    }, [craftingTree]);

    // No physics simulation - nodes stay in their initially calculated positions

    // Handle dragging of a node - simplified without physics
    const updateNodePosition = (nodeId, newX, newY) => {
        setNodePositions((prev) => ({
            ...prev,
            [nodeId]: { x: newX, y: newY },
        }));
    };

    // Generate SVG edges between nodes
    const renderEdges = () => {
        if (!craftingTree || Object.keys(nodePositions).length === 0)
            return null;

        const edges = [];

        // Recursive function to process ALL nodes and their connections
        function processNode(node) {
            if (!node || !node.ingredients || !Array.isArray(node.ingredients))
                return;

            const parentPos = nodePositions[node.id];
            if (!parentPos) return;

            // Calculate parent node size for edge positioning
            const parentNodeSize = getNodeSizeForElement(node);
            const parentRadius = parseInt(parentNodeSize.width) / 2;

            // Create edges to all children
            node.ingredients.forEach((child) => {
                if (!child || !child.id) return;

                const childPos = nodePositions[child.id];
                if (!childPos) return;

                // Calculate child node size for edge positioning
                const childNodeSize = getNodeSizeForElement(child);
                const childRadius = parseInt(childNodeSize.width) / 2;

                // Calculate the angle between parent and child
                const dx = childPos.x - parentPos.x;
                const dy = childPos.y - parentPos.y;
                const angle = Math.atan2(dy, dx);

                // Calculate the edge start and end points at the node boundaries
                const x1 = parentPos.x + Math.cos(angle) * parentRadius;
                const y1 = parentPos.y + Math.sin(angle) * parentRadius;
                const x2 = childPos.x - Math.cos(angle) * childRadius;
                const y2 = childPos.y - Math.sin(angle) * childRadius;

                // Keep the improved unique ID format to avoid React key errors
                edges.push({
                    id: `edge-${node.id}-to-${child.id}-${edges.length}`,
                    x1,
                    y1,
                    x2,
                    y2,
                });

                // Process this child's children
                processNode(child);
            });
        }

        // Helper function to calculate node size based on name length
        function getNodeSizeForElement(node) {
            const nameLength = node.name.length;
            let size;

            if (node.id === craftingTree.id) {
                // Root node
                size = Math.max(100, 80 + nameLength * 5);
            } else {
                size = Math.max(80, 60 + nameLength * 4);
            }

            return { width: `${size}px`, height: `${size}px` };
        }

        // Start from the root and process all nodes recursively
        processNode(craftingTree);

        return (
            <svg
                ref={svgRef}
                className="absolute top-0 left-0"
                style={{
                    width: "100%",
                    height: "100%",
                    zIndex: 2,
                    pointerEvents: "none",
                }}
            >
                {/* Draw all edges first as solid lines */}
                {edges.map((edge, index) => (
                    <line
                        key={`bg-${edge.id}-${index}`}
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke="rgba(180, 180, 180, 0.2)"
                        strokeWidth="4"
                    />
                ))}

                {/* Then draw dashed lines on top */}
                {edges.map((edge, index) => (
                    <line
                        key={`line-${edge.id}-${index}`}
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke="rgba(60, 60, 60, 0.8)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                    />
                ))}
            </svg>
        );
    };

    // Recursively render all nodes
    const renderNodes = () => {
        if (!craftingTree || Object.keys(nodePositions).length === 0)
            return null;

        const allNodes = [];

        function processNodeForRendering(node, isRoot = false) {
            if (!node) return;

            const pos = nodePositions[node.id];
            if (!pos) return;

            // Add this node to the render list
            allNodes.push(
                <ElementNode
                    key={node.id}
                    node={node}
                    x={pos.x}
                    y={pos.y}
                    isRoot={isRoot}
                    onDrag={(x, y) => updateNodePosition(node.id, x, y)}
                    onElementClick={onElementSelect}
                />
            );

            // Process all children
            if (node.ingredients && Array.isArray(node.ingredients)) {
                node.ingredients.forEach((child) => {
                    if (child) {
                        processNodeForRendering(child);
                    }
                });
            }
        }

        processNodeForRendering(craftingTree, true);

        return allNodes;
    };

    // Don't try to render if we don't have tree data or positions yet
    if (!craftingTree || Object.keys(nodePositions).length === 0 || !renderComplete) {
        return (
            <div className="flex items-center justify-center h-full">
                Initializing tree layout...
            </div>
        );
    }

    return (
        <div className="relative w-full h-full" style={{ overflow: "visible" }}>
            {renderEdges()}
            {renderNodes()}
        </div>
    );
}

/**
 * Draggable element node component that also supports clicking to navigate to the element's recipe
 */
function ElementNode({ node, x, y, isRoot = false, onDrag, onElementClick }) {
    const nodeRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const nodeStartPosRef = useRef({ x: 0, y: 0 });
    const clickTimeoutRef = useRef(null);
    const hasDraggedRef = useRef(false);
    const dragDistanceThreshold = 5; // Threshold in pixels to distinguish click from drag

    // Set up direct drag handling with click detection
    useEffect(() => {
        const nodeElement = nodeRef.current;
        if (!nodeElement) return;

        const handleMouseDown = (e) => {
            // Don't start drag on right-click or when modifier keys are pressed
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

            e.preventDefault();
            e.stopPropagation();

            // Reset drag detection
            hasDraggedRef.current = false;

            // Store starting positions
            dragStartPosRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
            };

            nodeStartPosRef.current = { x, y };

            setIsDragging(true);
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // Calculate movement distance to distinguish between drag and click
            const moveX = Math.abs(e.clientX - dragStartPosRef.current.mouseX);
            const moveY = Math.abs(e.clientY - dragStartPosRef.current.mouseY);
            
            // If moved beyond threshold, consider it a drag
            if (moveX > dragDistanceThreshold || moveY > dragDistanceThreshold) {
                hasDraggedRef.current = true;
            }

            e.preventDefault();

            // Get parent canvas
            const canvas = nodeElement.closest(".recipe-canvas");
            if (!canvas) return;

            // Get the current scale from the global reference
            const scale = window.currentZoomScale || 1;

            // Calculate mouse movement delta in scaled coordinates
            const deltaX = (e.clientX - dragStartPosRef.current.mouseX) / scale;
            const deltaY = (e.clientY - dragStartPosRef.current.mouseY) / scale;

            // Apply delta to original node position
            const newX = nodeStartPosRef.current.x + deltaX;
            const newY = nodeStartPosRef.current.y + deltaY;

            // Update the node position without physics
            onDrag(newX, newY);

            // Update start positions for next move
            dragStartPosRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
            };

            nodeStartPosRef.current = { x: newX, y: newY };
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                setIsDragging(false);
                
                // If user barely moved mouse, consider it a click
                if (!hasDraggedRef.current && onElementClick && node) {
                    // Small delay to prevent accidental clicks
                    setTimeout(() => {
                        onElementClick(node.name);
                    }, 10);
                }
            }
        };

        nodeElement.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            nodeElement.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, onDrag, onElementClick, node, x, y]);

    // Generate node color and style based on node type
    const getNodeStyle = () => {
        const clickableCursor = onElementClick ? (isDragging ? "grabbing" : "pointer") : (isDragging ? "grabbing" : "grab");
        
        // Special style for nodes that have been depth-limited
        if (node.isDepthLimited) {
            return {
                backgroundColor: "white",
                color: "#666",
                cursor: clickableCursor,
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                border: "2px dashed #aaa",  // Visual indicator that this node is depth-limited
                // Visual indicator for clickable state with hover effect
                transition: "all 0.2s ease-in-out"
            };
        }
        
        if (isRoot) {
            return {
                backgroundColor: "white",
                color: "black",
                cursor: clickableCursor,
                zIndex: 20,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                transition: "all 0.2s ease-in-out"
            };
        }

        if (node.isBasic) {
            return {
                backgroundColor: "white",
                color: "black",
                cursor: clickableCursor,
                zIndex: 10,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                transition: "all 0.2s ease-in-out"
            };
        }

        return {
            backgroundColor: "white",
            color: "black",
            cursor: clickableCursor,
            zIndex: 15,
            boxShadow: "0 3px 8px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s ease-in-out"
        };
    };

    // Size based on node type and name length - using equal width/height for circles
    const getNodeSize = () => {
        const nameLength = (node.name || "").length;
        let size;

        if (isRoot) {
            size = Math.max(100, 80 + nameLength * 5); // Larger for root
        } else if (node.isBasic) {
            size = Math.max(70, 60 + nameLength * 3.5); // Slightly smaller for basic elements
        } else {
            size = Math.max(80, 60 + nameLength * 4); // Adjust size based on name length
        }

        return { width: `${size}px`, height: `${size}px` };
    };

    const style = {
        ...getNodeStyle(),
        ...getNodeSize(),
        position: "absolute",
        borderRadius: "50%", // Perfect circle
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        // Simple transition for box-shadow effect when dragging
        transition: isDragging ? "none" : "box-shadow 0.3s ease"
    };

    return (
        <div
            ref={nodeRef}
            className={`element-node select-none ${onElementClick ? 'hover:shadow-xl hover:scale-105' : ''}`}
            style={style}
            onMouseDown={(e) => e.stopPropagation()}
            title={`${node.name}${node.isBasic ? " (Basic Element)" : ""}${node.isDepthLimited ? " (More ingredients not shown)" : ""}${onElementClick ? " (Click to view recipe)" : ""}`}
        >
            <div
                className="text-center font-medium"
                style={{ fontSize: "14px", padding: "8px" }}
            >
                {node.name}
                {node.isDepthLimited && (
                    <div className="text-xs text-blue-400 mt-1 font-normal">Click to view full recipe</div>
                )}
            </div>
        </div>
    );
}
