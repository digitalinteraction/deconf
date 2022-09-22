import { getConfig } from "./config.js";

export function find(object, path) {
  // If a string was passed, validate it and call again with the array versuib
  if (!Array.isArray(path)) {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error("Invalid path");
    }
    return find(object, path.split("/").slice(1));
  }

  // Get the current bit of the path to parse
  const [head, ...tail] = path;

  // If at the end of the path...
  if (path.length === 1) {
    // Return cloned values if ending in a wildcard
    if (head === "*") return Array.isArray(object) ? Array.from(object) : [];

    // Or the object value if it is defined
    const value = object?.[head];
    return value !== undefined ? [value] : [];
  }

  // Recursively process wildcards
  if (head === "*") {
    return Array.isArray(object)
      ? object.flatMap((nested) => find(nested, tail))
      : [];
  }

  // If a valid object is next, recurse into it with the remainding path
  const value = object?.[head];
  if (typeof value === "object" && object !== null) {
    return find(value, tail);
  }

  // If not found, return no results
  return [];
}

export async function testFn() {
  const config = await getConfig();

  const testPaths = [
    "/site/customScripts/*",
    "/site/customStyles/*",
    "/site/opengraph/image",
    "/navigation/*/icon",
    "/pages/*/home/sponsors/*/sponsors/*/image",

    // ...

    "/pages/*/home/widgets/*/builtin/faIcon",
    "/pages/*/home/widgets/*/page/faIcon",
    "/pages/*/home/widgets/*/url/faIcon",
    "/taxonomies/*/faIcon",
    "/taxonomies/*/options/*/faIcon",

    // ... misc

    "/pages/*/home/sponsors/*/sponsors/1/image",

    "/branding/*/url",
  ];

  for (const path of testPaths) {
    console.log(path, find(config, path));
  }
}

// testFn();
