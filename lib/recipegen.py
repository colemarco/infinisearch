import json
import sys
import time


def load_dag(json_file="crafting_dag.json"):
    """Load the crafting DAG from the JSON file"""
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Error: {json_file} not found. Run generate.py first.")
        sys.exit(1)


def find_element_by_name(elements_dict, target_name):
    """Find an element ID by its name"""
    for elem_id, data in elements_dict.items():
        if data["name"].lower() == target_name.lower():
            return elem_id
    return None


def find_crafting_path(target_name, dag_file="crafting_dag.json"):
    """Find the crafting path to the target element"""
    start_time = time.time()
    dag_data = load_dag(dag_file)

    elements = {}
    crafting_recipes = {}

    for node in dag_data["nodes"]:
        if "Element" in node["labels"]:
            elements[node["id"]] = {
                "name": node["properties"]["name"],
                "depth": node["properties"]["depth"],
            }

    pairs_to_results = {}
    for rel in dag_data["relationships"]:
        if rel["type"] == "RESULTS_IN":
            pairs_to_results[rel["start"]] = rel["end"]

    pair_ingredients = {}
    for rel in dag_data["relationships"]:
        if rel["type"] == "PART_OF":
            if rel["end"] not in pair_ingredients:
                pair_ingredients[rel["end"]] = []
            pair_ingredients[rel["end"]].append(rel["start"])

    for pair_id, ingredients in pair_ingredients.items():
        if len(ingredients) == 2 and pair_id in pairs_to_results:
            result_id = pairs_to_results[pair_id]
            crafting_recipes[result_id] = ingredients

    target_id = find_element_by_name(elements, target_name)
    if target_id is None:
        return None

    cache = {}
    visited = set()

    def build_tree(element_id):
        if element_id in cache:
            return cache[element_id]

        if element_id not in elements:
            return None

        if elements[element_id]["depth"] == 0:
            tree = {
                "id": element_id,
                "name": elements[element_id]["name"],
                "is_basic": True,
            }
            cache[element_id] = tree
            return tree

        if element_id not in crafting_recipes:
            return None

        ingredient_ids = crafting_recipes[element_id]
        ingredient_trees = [build_tree(ing_id) for ing_id in ingredient_ids]

        tree = {
            "id": element_id,
            "name": elements[element_id]["name"],
            "is_basic": False,
            "ingredients": ingredient_trees,
        }
        cache[element_id] = tree
        return tree

    crafting_tree = build_tree(target_id)

    elapsed = time.time() - start_time
    print(f"Crafting tree built in {elapsed:.3f} seconds.")
    if target_id in elements:
        print(f"Target element depth: {elements[target_id]['depth']}")
    print(f"Recipe tree includes {len(cache)} unique elements.")

    return crafting_tree


def print_crafting_tree(tree, indent=0):
    """Print the crafting tree in a readable format"""
    if tree is None:
        return

    prefix = "  " * indent
    if indent > 0:
        prefix = prefix[:-2] + "└─"

    if tree["is_basic"]:
        print(f"{prefix}{tree['name']} (BASIC)")
    else:
        print(f"{prefix}{tree['name']}")
        for ingredient in tree["ingredients"]:
            print_crafting_tree(ingredient, indent + 1)


def main():
    target = "George Clooney"

    if len(sys.argv) > 1:
        target = " ".join(sys.argv[1:])

    print(f"Finding crafting path for: {target}")
    crafting_tree = find_crafting_path(target)

    if crafting_tree is None:
        print(f"Could not find a crafting path for '{target}'.")
        return

    print("\nCrafting Tree:")
    print_crafting_tree(crafting_tree)


if __name__ == "__main__":
    main()
