// Constants
const DATA_SOURCE = "/root/datas/reg.json";
const ADMINISTRATIVE_LEVELS = {
  region: "district",
  district: "commune",
  commune: "fokontany",
  fokontany: null,
};

const REVERSE_HIERARCHY = {
  district: "region",
  commune: "district",
  fokontany: "commune",
  region: null,
};

// Data fetching
async function fetchRegions() {
  try {
    const response = await fetch(DATA_SOURCE);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: Failed to fetch regions`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching regions:", error);
    return [];
  }
}

function sortRegionsByName(regions) {
  return regions?.sort((a, b) => a.name.localeCompare(b.name)) || [];
}

// Hierarchy management
function getChildType(parentType) {
  return ADMINISTRATIVE_LEVELS[parentType] || null;
}

function getParentType(childType) {
  return REVERSE_HIERARCHY[childType] || null;
}

// Child counting
function countChildren(node, childType) {
  const counter = {
    district: () => node.district?.length || 0,

    commune: () => {
      if (node.district) {
        return node.district.reduce(
          (total, district) => total + (district.commune?.length || 0),
          0
        );
      }
      return node.commune?.length || 0;
    },

    fokontany: () => {
      // Region level
      if (node.district) {
        return node.district.reduce((regionTotal, district) => {
          if (!district.commune) return regionTotal;
          return (
            regionTotal +
            district.commune.reduce(
              (districtTotal, commune) =>
                districtTotal + (commune.fokontany?.length || 0),
              0
            )
          );
        }, 0);
      }

      // District level
      if (node.commune) {
        return node.commune.reduce(
          (total, commune) => total + (commune.fokontany?.length || 0),
          0
        );
      }

      // Commune level
      return node.fokontany?.length || 0;
    },
  };

  return counter[childType] ? counter[childType]() : 0;
}

// Child collection
function collectChildren(node, parentType) {
  const childType = getChildType(parentType);
  if (!childType) return [];
  
  const collector = {
    district: () => node.district || [],

    commune: () => {
      if (parentType === "region" && node.district) {
        return node.district.flatMap((district) => district.commune || []);
      }
      return node.commune || [];
    },

    fokontany: () => {
      if (parentType === "region" && node.district) {
        return node.district.flatMap(
          (district) =>
            district.commune?.flatMap((commune) => commune.fokontany || []) ||
            []
        );
      }

      if (parentType === "district" && node.commune) {
        return node.commune.flatMap((commune) => commune.fokontany || []);
      }


      return node.fokontany || [];
    },
  };
  
  return collector[childType] ? collector[childType]() : [];
}

// Sibling finder
function findSiblings(foundItem, regionsData) {
  const parentType = getParentType(foundItem.type);
  if (!parentType) return [];

  const parentNode = locateParent(foundItem, regionsData);
  if (!parentNode) return [];

  const siblingExtractor = {
    region: () =>
      (parentNode.district || []).filter((d) => d.name !== foundItem.name),
    district: () =>
      (parentNode.commune || []).filter((c) => c.name !== foundItem.name),
    commune: () =>
      (parentNode.fokontany || []).filter((f) => f.name !== foundItem.name),
  };

  return siblingExtractor[parentType] ? siblingExtractor[parentType]() : [];
}

function locateParent(foundItem, regionsData) {
  for (const region of regionsData) {
    const parent = searchForParent(region, foundItem);
    if (parent) return parent;
  }
  return null;
}

function searchForParent(node, targetItem) {
  const lastParent =
    targetItem.hierarchyPath[targetItem.hierarchyPath.length - 1];
  if (!lastParent) return null;

  // Check current node
  if (node.name === lastParent.name) {
    return node;
  }

  // Search in districts
  if (node.district) {
    for (const district of node.district) {
      if (district.name === lastParent.name) return district;

      // Search in communes
      if (district.commune) {
        for (const commune of district.commune) {
          if (commune.name === lastParent.name) return commune;
        }
      }
    }
  }

  return null;
}

// Tree building
function buildTree(foundItem, limit = 10) {
  const childType = getChildType(foundItem.type);
  const children = childType
    ? collectChildren(foundItem.nodeData, foundItem.type).slice(0, limit)
    : [];

  return {
    node: foundItem,
    children: children.map((child) => ({
      node: child,
      type: childType,
      children: [],
    })),
    depth: 0,
  };
}

function loadAllChildren(result) {
  const childType = getChildType(result.type);
  return childType
    ? {
        ...result,
        children: collectChildren(result.nodeData, result.type),
      }
    : result;
}

// ID generation
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Search utilities
function evaluateMatch(text, searchTerm) {
  const textLower = text?.toLowerCase() || "";
  const searchLower = searchTerm.toLowerCase();

  return {
    isMatch: textLower.includes(searchLower),
    isExactMatch: textLower === searchLower,
    nodeName: textLower,
  };
}

function createSearchResult(
  node,
  levelType,
  path,
  matchInfo,
  normalizedSearch
) {
  return {
    id: node.id || generateId(),
    name: node.name,
    type: levelType,
    exactMatch: matchInfo.isExactMatch,
    matchScore: calculateMatchScore(matchInfo.nodeName, normalizedSearch),
    hierarchyPath: [...path],
    childrenCount: {
      districts: countChildren(node, "district"),
      communes: countChildren(node, "commune"),
      fokontany: countChildren(node, "fokontany"),
    },
    nodeData: node,
  };
}

// Core search function
async function hierarchicalSearch(searchTerm, regionsData, filter = "all") {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  if (!normalizedSearch || normalizedSearch.length < 2) return [];

  const results = [];

  function searchNode(node, path = [], levelType) {
    const parentType = getParentType(levelType);
    const childType = getChildType(levelType);

    // Build path
    const currentPath = [...path];
    currentPath.push({
      type: parentType ? getParentType(childType) : levelType || "fokontany",
      name: node.name,
    });

    // Check for match
    const matchInfo = evaluateMatch(node.name, normalizedSearch);
    if (matchInfo.isMatch && (filter === "all" || levelType === filter)) {
      results.push(
        createSearchResult(
          node,
          levelType,
          currentPath,
          matchInfo,
          normalizedSearch
        )
      );
    }

    // Recursively search children
    if (childType && node[childType]) {
      node[childType].forEach((child) => {
        searchNode(child, currentPath, childType);
      });
    }
  }

  // Start search from all regions
  regionsData.forEach((region) => {
    searchNode(region, [{ type: "country", name: "Madagascar" }], "region");
  });

  // Sort results by relevance
  return sortResults(results);
}

function sortResults(results) {
  return results.sort((a, b) => {
    // Exact matches first
    if (a.exactMatch !== b.exactMatch) {
      return a.exactMatch ? -1 : 1;
    }

    // Match score
    if (a.matchScore !== b.matchScore) {
      return b.matchScore - a.matchScore;
    }

    // Hierarchy depth (closer to root is better)
    if (a.hierarchyPath.length !== b.hierarchyPath.length) {
      return a.hierarchyPath.length - b.hierarchyPath.length;
    }

    // Alphabetical as final tie-breaker
    return a.name.localeCompare(b.name);
  });
}

// Hierarchy context
function getHierarchyContext(foundItem, regionsData) {
  const children = collectChildren(foundItem.nodeData, foundItem.type);
  const siblings = findSiblings(foundItem, regionsData);

  return {
    item: foundItem,
    parents: [...foundItem.hierarchyPath],
    children,
    siblings,
    completeHierarchy: [
      ...foundItem.hierarchyPath,
      { type: foundItem.type, name: foundItem.name },
      ...children.map((child) => ({
        type: getChildType(foundItem.type),
        name: child.name,
      })),
    ],
  };
}

// Match scoring with improved algorithm
function calculateMatchScore(text, searchTerm) {
  if (!text || !searchTerm) return 0;

  let score = 0;
  const searchLower = searchTerm.toLowerCase();
  const textLower = text.toLowerCase();

  const scoringRules = [
    // Exact match
    { condition: () => textLower === searchLower, points: 1000 },

    // Starts with
    { condition: () => textLower.startsWith(searchLower), points: 500 },

    // Contains
    { condition: () => textLower.includes(searchLower), points: 300 },
  ];

  // Apply basic scoring rules
  scoringRules.forEach((rule) => {
    if (rule.condition()) score += rule.points;
  });

  // Word-based scoring
  const words = textLower.split(/[\s\-\_\.\,]+/);
  words.forEach((word) => {
    if (word === searchLower) score += 400;
    if (word.startsWith(searchLower)) score += 200;
    if (word.includes(searchLower)) score += 100;
  });

  // Acronym/initial matches
  const initials = words.map((w) => w.charAt(0)).join("");
  if (initials.toLowerCase().includes(searchLower)) score += 150;

  // Partial beginning matches
  let hasPartial = false;
  words.forEach((word) => {
    for (let i = 1; i < searchLower.length; i++) {
      if (word.startsWith(searchLower.substring(0, i))) {
        score += 50 - i;
        hasPartial = true;
      }
    }
  });
  if (hasPartial) score += 50;

  // Length penalty
  score -= textLower.length * 0.5;

  // Penalize generic administrative terms
  const genericTerms = [
    "district",
    "commune",
    "region",
    "fokontany",
    "ville",
    "city",
    "town",
  ];
  genericTerms.forEach((term) => {
    if (textLower.includes(term)) score -= 20;
  });

  return Math.max(0, Math.round(score));
}

function getChildCount(node, childType) {
  switch (childType) {
    case "district":
      return node.district?.length || 0;
    case "commune":
      // If node is region, count all communes in all districts
      if (node.district) {
        return node.district.reduce(
          (total, district) => total + (district.commune?.length || 0),
          0
        );
      }
      // If node is district, count its communes
      return node.commune?.length || 0;
    case "fokontany":
      // If node is region, count all fokontany
      if (node.district) {
        return node.district.reduce((total, district) => {
          if (district.commune) {
            return (
              total +
              district.commune.reduce(
                (subTotal, commune) =>
                  subTotal + (commune.fokontany?.length || 0),
                0
              )
            );
          }
          return total;
        }, 0);
      }
      // If node is district, count fokontany in its communes
      if (node.commune) {
        return node.commune.reduce(
          (total, commune) => total + (commune.fokontany?.length || 0),
          0
        );
      }
      // If node is commune, count its fokontany
      return node.fokontany?.length || 0;
    default:
      return 0;
  }
}
