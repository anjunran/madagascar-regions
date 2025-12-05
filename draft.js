const nodeName = node.name?.toLowerCase() || "";

// Check for match
const isMatch = nodeName.includes(normalizedSearch);
const isExactMatch = nodeName === normalizedSearch;

// if (isMatch && (filter === "all" || levelType === filter)) {
//   results.push({
//     id: node.id || generateId(),
//     name: node.name,
//     type: levelType,
//     exactMatch: isExactMatch,
//     matchScore: calculateMatchScore(nodeName, normalizedSearch),
//     hierarchyPath: [...path],
//     childrenCount: {
//       districts: getChildCount(node, "district"),
//       communes: getChildCount(node, "commune"),
//       fokontany: getChildCount(node, "fokontany"),
//     },
//     nodeData: node,
//   });
// }

// Recursively search children
const childType = getChildType(levelType);

if (childType === "district" && node.district) {
  node.district.forEach((district) => {
    searchNode(
      district,
      [...path, { type: "region", name: node.name }],
      "district"
    );
  });
}

if (childType === "commune") {
  // If node is region, search all communes in all districts
  if (levelType === "region" && node.district) {
    node.district.forEach((district) => {
      if (district.commune) {
        district.commune.forEach((commune) => {
          searchNode(
            commune,
            [
              ...path,
              { type: "region", name: node.name },
              { type: "district", name: district.name },
            ],
            "commune"
          );
        });
      }
    });
  }
  // If node is district, search its communes
  else if (node.commune) {
    node.commune.forEach((commune) => {
      searchNode(
        commune,
        [
          ...path,
          {
            type: "district",
            name: path[path.length - 1]?.name || node.name,
          },
        ],
        "commune"
      );
    });
  }
}

if (childType === "fokontany") {
  // Search fokontany based on parent type
  if (levelType === "region" && node.district) {
    node.district.forEach((district) => {
      if (district.commune) {
        district.commune.forEach((commune) => {
          if (commune.fokontany) {
            commune.fokontany.forEach((fokontany) => {
              searchNode(
                fokontany,
                [
                  ...path,
                  { type: "region", name: node.name },
                  { type: "district", name: district.name },
                  { type: "commune", name: commune.name },
                ],
                "fokontany"
              );
            });
          }
        });
      }
    });
  } else if (levelType === "district" && node.commune) {
    node.commune.forEach((commune) => {
      if (commune.fokontany) {
        commune.fokontany.forEach((fokontany) => {
          searchNode(
            fokontany,
            [
              ...path,
              { type: "district", name: node.name },
              { type: "commune", name: commune.name },
            ],
            "fokontany"
          );
        });
      }
    });
  } else if (levelType === "commune" && node.fokontany) {
    node.fokontany.forEach((fokontany) => {
      searchNode(
        fokontany,
        [...path, { type: "commune", name: node.name }],
        "fokontany"
      );
    });
  }
}
