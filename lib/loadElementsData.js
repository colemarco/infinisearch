import fs from "fs";
import path from "path";
import Papa from "papaparse";

// Prepares elements csv for use in search bar with Fuse.js
export async function getElementsData() {
    const filePath = path.join(process.cwd(), "data", "elements.csv");
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Using Papa Parse to parse the CSV
    const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
    });

    // Each item should be an object with properties that Fuse can search
    const fuseItems = parseResult.data.map((element) => {
        return {
            id: element.id,
            name: element.name,
        };
    });

    return fuseItems;
}
