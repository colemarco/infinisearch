"use client";

import { useState, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import Papa from "papaparse";

/**
 * SearchBar component styled after macOS Spotlight search
 * @param {Object} props - Component props
 * @param {Object|null} props.selectedItem - The selected item containing id and name or null
 * @param {Function} props.setSelectedItem - Function to set the selected item
 * @returns {JSX.Element} SearchBar component
 */
export default function SearchBar({ selectedItem, setSelectedItem }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [fuse, setFuse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Load data on client-side
    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                const response = await fetch("/data/elements.csv");
                const csvText = await response.text();

                // Parse CSV
                const parseResult = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                });

                // Format data for Fuse
                const elementData = parseResult.data.map((element) => ({
                    id: element.id,
                    name: element.name,
                }));

                // Initialize Fuse.js with improved settings for macOS-like experience
                const fuseOptions = {
                    keys: ["name"],
                    threshold: 0.3, // More forgiving threshold
                    includeScore: true,
                    minMatchCharLength: 1,
                    shouldSort: true,
                };

                setFuse(new Fuse(elementData, fuseOptions));
                setIsLoading(false);
            } catch (error) {
                console.error("Error loading element data:", error);
                setIsLoading(false);
            }
        }

        loadData();

        // Focus the search input on component mount
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }

        // No keyboard shortcuts
    }, []);

    /**
     * Handle search input changes with debounce
     * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
     */
    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        // Clear any existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new debounce timer (300ms)
        debounceTimerRef.current = setTimeout(() => {
            if (fuse && value.length > 0) {
                const searchResults = fuse.search(value, { limit: 6 });
                setResults(searchResults);
            } else {
                setResults([]);
            }
        }, 300);
    };

    // Ensure we clear the timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
    
    // Handle repositioning when an item is selected
    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (selectedItem && mainElement) {
            // Animate the main container to move search bar up
            mainElement.classList.remove('pt-[20vh]');
            mainElement.classList.add('pt-[5vw]');
        } else if (mainElement) {
            // Return to original position
            mainElement.classList.remove('pt-[5vw]');
            mainElement.classList.add('pt-[20vh]');
        }
    }, [selectedItem]);

    const handleFocus = () => {
        setIsFocused(true);
        // Clear selected item when user focuses back on search
        setSelectedItem(null);
        
        // Re-populate search results if there's text in the search field
        if (searchTerm.length > 0 && fuse) {
            const searchResults = fuse.search(searchTerm, { limit: 6 });
            setResults(searchResults);
        }
    };
    
    const handleBlur = () => {
        // Small delay to handle click on results
        setTimeout(() => setIsFocused(false), 150);
    };


    return (
        <div className="w-full mx-auto transition-all duration-300">
            {/* Unified container with shadow and gradient border */}
            <div className={`search-gradient-border ${searchTerm ? 'active' : ''} ${
                results.length > 0 && isFocused 
                  ? "rounded-xl overflow-hidden" 
                  : "rounded-xl overflow-hidden"
            }`}>
                {/* Search input container */}
                <div className={`relative ${
                    results.length > 0 && isFocused ? "" : "rounded-xl shadow-lg overflow-hidden"
                }`}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearch}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={
                            isLoading ? "Loading elements..." : "Search elements..."
                        }
                        disabled={isLoading}
                        className={`w-full py-3 pl-11 pr-4 bg-[var(--search-bg)] backdrop-blur-md text-[16px] focus:outline-none ${
                            results.length > 0 && isFocused ? "rounded-t-xl" : "rounded-xl"
                        }`}
                    />

                    {/* Search icon (left side) */}
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>

                    {/* Clear button (right side) */}
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setResults([]);
                                setSelectedItem(null);
                                if (searchInputRef.current) {
                                    searchInputRef.current.focus();
                                }
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 z-10"
                        >
                            <span className="sr-only">Clear search</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Results container - direct continuation of search bar */}
                {results.length > 0 && isFocused && (
                    <div className="bg-[var(--search-bg)] rounded-b-xl overflow-hidden shadow-lg">
                        <ul>
                            {results.map(({ item }, index) => (
                                <li
                                    key={item.id}
                                    className={`px-4 py-3 hover:bg-[var(--search-hover)] cursor-default`}
                                    onClick={() => {
                                        setSearchTerm(item.name);
                                        setResults([]);
                                        setSelectedItem({ id: item.id, name: item.name });
                                        setIsFocused(false);
                                    }}
                                >
                                    <div className="flex items-center">
                                        <p className="font-medium text-[14px]">
                                            {item.name}
                                        </p>
                                        {index === 0 && (
                                            <span className="text-xs text-gray-500 opacity-60 ml-auto">
                                                Top Match
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
