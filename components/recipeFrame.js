"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { buildCraftingTree } from "@/lib/craftingTree";

/**
 * RecipeFrame component for displaying recipe information
 * @param {Object} props - Component props
 * @param {Object} props.selectedItem - The selected item containing id and name
 * @returns {JSX.Element} RecipeFrame component
 */
export default function RecipeFrame({ selectedItem }) {
    const [craftingTree, setCraftingTree] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scale, setScale] = useState(1);
    const transformRef = useRef(null);

    // Create a global reference to the current scale that can be accessed by child components
    if (typeof window !== "undefined") {
        window.currentZoomScale = scale;
    }

    // Load the crafting tree when the selected item changes
    useEffect(() => {
        if (!selectedItem) return;

        setLoading(true);

        // Use an async function to handle the tree building
        const loadTree = async () => {
            try {
                // Get the tree from our DAG-based function (now async)
                const tree = await buildCraftingTree(selectedItem.name);
                setCraftingTree(tree);

                // Reset the view with a slight delay to ensure components are ready
                setTimeout(() => {
                    if (transformRef.current) {
                        transformRef.current.resetTransform();
                    }
                }, 100);
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
            } finally {
                setLoading(false);
            }
        };

        // Run the async function with a small delay to prevent UI freezing
        const timeoutId = setTimeout(() => {
            loadTree();
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
                            <DynamicRecipeTree craftingTree={craftingTree} />
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
function DynamicRecipeTree({ craftingTree }) {
    // State to keep track of node positions
    const [nodePositions, setNodePositions] = useState({});
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

    // Initialize node positions using a more dynamic layout algorithm
    useEffect(() => {
        if (!craftingTree) return;

        const initialPositions = {};

        // Start at the center of our container
        // With real data, we need more space for potentially larger trees
        const centerX = 2500;
        const centerY = 300; // Start even higher up to give more space for potentially deeper trees

        // First pass: Calculate the tree dimensions and node sizes
        function calculateTreeDimensions(node, level = 0) {
            if (!node)
                return { width: 0, height: 0, nodeCount: 0, maxDepth: level };

            // Calculate this node's size based on name length
            const nameLength = (node.name || "").length;
            const nodeSize =
                node.id === craftingTree.id
                    ? Math.max(100, 80 + nameLength * 5) // Root node
                    : node.isBasic
                    ? Math.max(70, 60 + nameLength * 3.5) // Basic element
                    : Math.max(80, 60 + nameLength * 4); // Compound element

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
                calculateTreeDimensions(child, level + 1)
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
                1 +
                childDimensions.reduce((sum, dim) => sum + dim.nodeCount, 0);

            // The node's subtree width is the max of its own width and its children's total width
            const subtreeWidth = Math.max(nodeSize, totalChildWidth);

            // Height is based on the deepest path
            const subtreeHeight =
                nodeSize +
                (maxChildDepth > level ? maxChildDepth - level : 0) * 150;

            return {
                width: subtreeWidth,
                height: subtreeHeight,
                nodeCount: totalNodeCount,
                maxDepth: maxChildDepth,
            };
        }

        // Calculate overall tree dimensions
        const treeDimensions = calculateTreeDimensions(craftingTree);

        // Second pass: Position nodes based on calculated dimensions
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
                calculateTreeDimensions(child, level + 1)
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
        setNodePositions(initialPositions);
    }, [craftingTree]);

    // Physics simulation references
    const physicsRef = useRef(null);
    const isPhysicsRunningRef = useRef(false);

    // Function to calculate repulsion forces between nodes
    const applyRepulsionPhysics = useCallback((activeDragNodeId = null) => {
        if (!craftingTree || Object.keys(nodePositions).length === 0)
            return false;

        // Clone the current positions
        const newPositions = { ...nodePositions };
        const nodeIds = Object.keys(newPositions);
        let hasChanges = false;

        // Process each node pair and apply repulsion forces
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId1 = nodeIds[i];
            const pos1 = newPositions[nodeId1];

            // Skip if this node has been deleted
            if (!pos1) continue;

            // Skip if this is the node being dragged (during active drag)
            if (activeDragNodeId && nodeId1 === activeDragNodeId) continue;

            // Get node 1 dimensions based on node size
            const node1 = findNodeById(craftingTree, nodeId1);
            if (!node1) continue;
            const node1Size = getNodeSizePixels(node1);

            // For each other node
            for (let j = i + 1; j < nodeIds.length; j++) {
                const nodeId2 = nodeIds[j];
                const pos2 = newPositions[nodeId2];

                // Skip if this node has been deleted
                if (!pos2) continue;

                // Skip if this is the node being dragged (during active drag)
                if (activeDragNodeId && nodeId2 === activeDragNodeId) continue;

                // Get node 2 dimensions
                const node2 = findNodeById(craftingTree, nodeId2);
                if (!node2) continue;
                const node2Size = getNodeSizePixels(node2);

                // Calculate distance between nodes
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Determine minimum distance to avoid overlap (sum of radii plus a larger margin)
                // With real data, use even more spacing to prevent overcrowding
                const minDistance = node1Size / 2 + node2Size / 2 + 70; // Increased to 70 for real data

                // If nodes are too close, apply repulsion
                if (distance < minDistance && distance > 0) {
                    hasChanges = true;

                    // Calculate repulsion force
                    // With real data, use stronger forces overall for better spacing
                    const forceFactor = activeDragNodeId ? 0.5 : 0.35; // Increased for real data
                    const force = (minDistance - distance) * forceFactor;

                    // Direction vector
                    const unitX = dx / distance || 0;
                    const unitY = dy / distance || 0;

                    // Apply forces to both nodes (they move away from each other)
                    newPositions[nodeId1] = {
                        x: pos1.x - unitX * force,
                        y: pos1.y - unitY * force,
                    };

                    newPositions[nodeId2] = {
                        x: pos2.x + unitX * force,
                        y: pos2.y + unitY * force,
                    };
                }
            }
        }

        // Update positions if there were changes
        if (hasChanges) {
            setNodePositions(newPositions);
            return true; // Indicate that changes were made
        }

        return false; // No changes
    }, [craftingTree, nodePositions, findNodeById, getNodeSizePixels]);

    // Start physics after initial positioning
    // Start or restart physics simulation using useCallback to prevent infinite loops
    const startPhysicsSimulation = useCallback(() => {
        if (Object.keys(nodePositions).length > 0) {
            // Clear any existing interval
            if (physicsRef.current) {
                clearInterval(physicsRef.current);
            }

            isPhysicsRunningRef.current = true;
            let iterationCount = 0;
            const maxIterations = 50; // Safety limit for iterations

            // Run physics simulation every 16ms (≈60fps) for smooth animation
            physicsRef.current = setInterval(() => {
                // Apply physics and check if any changes were made
                const hadChanges = applyRepulsionPhysics();
                iterationCount++;

                // Stop the simulation if:
                // 1. No more changes are needed (nodes are properly spaced), or
                // 2. We've reached the maximum iteration count (prevents endless running)
                if (!hadChanges || iterationCount > maxIterations) {
                    isPhysicsRunningRef.current = false;
                    clearInterval(physicsRef.current);
                    physicsRef.current = null;
                }
            }, 16); // 16ms ≈ 60fps for smoother animation
        }
    }, [nodePositions, applyRepulsionPhysics]);

    // Start physics after initial positioning
    useEffect(() => {
        if (Object.keys(nodePositions).length > 0) {
            startPhysicsSimulation();
        }

        // Clean up physics simulation on unmount
        return () => {
            if (physicsRef.current) {
                clearInterval(physicsRef.current);
            }
        };
    }, [nodePositions, startPhysicsSimulation]);

    // Handle dragging of a node
    const updateNodePosition = (nodeId, newX, newY, isDragging = false) => {
        setNodePositions((prev) => ({
            ...prev,
            [nodeId]: { x: newX, y: newY },
        }));

        // If actively dragging, apply a single iteration of physics immediately
        if (isDragging) {
            // We'll run a single step of physics without an interval
            // Pass the nodeId so the physics knows which node is being dragged
            setTimeout(() => {
                applyRepulsionPhysics(nodeId);
            }, 0);
        }
        // Otherwise restart the physics simulation when drag ends
        else if (!isPhysicsRunningRef.current) {
            startPhysicsSimulation();
        }
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

    if (!craftingTree || Object.keys(nodePositions).length === 0) {
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
 * Draggable element node component
 */
function ElementNode({ node, x, y, isRoot = false, onDrag }) {
    const nodeRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const nodeStartPosRef = useRef({ x: 0, y: 0 });

    // Set up direct drag handling
    useEffect(() => {
        const nodeElement = nodeRef.current;
        if (!nodeElement) return;

        const handleMouseDown = (e) => {
            // Don't start drag on right-click or when modifier keys are pressed
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

            e.preventDefault();
            e.stopPropagation();

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

            // Update the node position with isDragging flag
            onDrag(newX, newY, true);

            // Update start positions for next move
            dragStartPosRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
            };

            nodeStartPosRef.current = { x: newX, y: newY };
        };

        const handleMouseUp = () => {
            if (isDragging) {
                // Update position one more time with isDragging=false to start the physics simulation
                onDrag(
                    nodeStartPosRef.current.x,
                    nodeStartPosRef.current.y,
                    false
                );
                setIsDragging(false);
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
    }, [isDragging, onDrag, x, y]);

    // Generate node color and style based on node type
    const getNodeStyle = () => {
        if (isRoot) {
            return {
                backgroundColor: "white",
                color: "black",
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: 20,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            };
        }

        if (node.isBasic) {
            return {
                backgroundColor: "white",
                color: "black",
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: 10,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
            };
        }

        return {
            backgroundColor: "white",
            color: "black",
            cursor: isDragging ? "grabbing" : "grab",
            zIndex: 15,
            boxShadow: "0 3px 8px rgba(0, 0, 0, 0.1)",
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
        // When dragging, disable transition for the dragged node only
        // For non-dragged nodes that move due to repulsion, use a faster transition
        transition: isDragging
            ? "none"
            : "transform 0.05s ease-out, box-shadow 0.3s ease", // Faster transition
    };

    return (
        <div
            ref={nodeRef}
            className="element-node select-none"
            style={style}
            onMouseDown={(e) => e.stopPropagation()}
            title={`${node.name}${node.isBasic ? " (Basic Element)" : ""}`}
        >
            <div
                className="text-center font-medium"
                style={{ fontSize: "14px", padding: "8px" }}
            >
                {node.name}
            </div>
        </div>
    );
}
