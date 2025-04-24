"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/searchBar";
import RecipeFrame from "@/components/recipeFrame";

export default function Home() {
    const [selectedItem, setSelectedItem] = useState(null);

    // Handle repositioning when an item is selected
    useEffect(() => {
        const mainElement = document.querySelector("main");
        if (selectedItem && mainElement) {
            // Animate the main container to move search bar up
            mainElement.classList.remove("pt-[20vh]");
            mainElement.classList.add("pt-[3vw]");
        } else if (mainElement) {
            // Return to original position
            mainElement.classList.remove("pt-[3vw]");
            mainElement.classList.add("pt-[20vh]");
        }
    }, [selectedItem]);

    return (
        <main className="flex min-h-screen flex-col items-center pt-[20vh] px-[5vw] pb-[2vw] transition-all duration-300 gap-[3vw]">
            <div
                id="search-container"
                className="w-full max-w-[580px] mx-auto relative"
            >
                <SearchBar
                    selectedItem={selectedItem}
                    setSelectedItem={setSelectedItem}
                />
            </div>

            {/* Recipe Frame positioned below search bar */}
            {selectedItem && (
                <div
                    id="recipe-container"
                    className="w-full max-w-[90%] mx-auto"
                >
                    <RecipeFrame selectedItem={selectedItem} />
                </div>
            )}
        </main>
    );
}
