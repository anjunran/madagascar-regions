const stateInit = () => {
  Alpine.data("appState", () => ({
    regions: [],
    selectedRegion: "",
    regionToShow: null,
    isLoading: true,
    search_slider: null,
    hierarchicalSearchTerm: "",
    hierarchicalSearchResults: {
      results: [],
      totalMatches: 0,
      filteredBy: null,
      searchTime: 0,
    },
    selectedHierarchicalResult: null,
    searchFilter: "all",

    fetchRegions: fetchRegions,
    getHierarchyContext: getHierarchyContext,
    hierarchicalSearch: hierarchicalSearch,
    sortRegionsByName: sortRegionsByName,

    async init() {
      try {
        this.regions = await this.fetchRegions();
        this.regions = this.sortRegionsByName(this.regions);
        if (this.regions.length > 0) {
          this.regionToShow = this.regions[0];
        }
      } catch (error) {
        console.error("Failed to load regions:", error);
      } finally {
        this.isLoading = false;
        this.searchSlide = new Slider({
          selector: "#searchSlide",
          autoSlide: false,
        });
      }
    },

    get searchSlide() {
      this._validateSliderDependancy();
      return this.search_slider;
    },

    set searchSlide(slider) {
      if (slider && typeof slider.init === "function") {
        this.search_slider = slider;
      } else {
        console.warn("Invalid slider object provided");
      }
    },

    get filteredRegions() {
      if (!this.selectedRegion) return this.sortRegionsByName(this.regions);
      return this.regions.filter((region) =>
        region?.name.toLowerCase().includes(this.selectedRegion.toLowerCase())
      );
    },
    get regionDetails() {
      return this.regionToShow || {};
    },

    // New methods
    async performHierarchicalSearch() {
      if (
        !this.hierarchicalSearchTerm ||
        this.hierarchicalSearchTerm.length < 2
      ) {
        this.hierarchicalSearchResults = { results: [], totalMatches: 0 };
        return;
      }

      const startTime = performance.now();

      const results = await this.hierarchicalSearch(
        this.hierarchicalSearchTerm,
        this.regions,
        this.searchFilter
      );

      const endTime = performance.now();

      this.hierarchicalSearchResults = {
        results: results,
        totalMatches: results.length,
        filteredBy: this.searchFilter === "all" ? null : this.searchFilter,
        searchTime: Math.round(endTime - startTime),
      };
    },

    clearHierarchicalSearch() {
      this.hierarchicalSearchTerm = "";
      this.hierarchicalSearchResults = { results: [], totalMatches: 0 };
      this.selectedHierarchicalResult = null;
    },

    selectHierarchicalResult(result) {
      this.selectedHierarchicalResult = result;

      // Get complete hierarchical context
      const context = this.getHierarchyContext(result, this.regions);

      this.selectedHierarchicalResult = {
        ...result,
        ...context,
      };
    },

    findAndSelectParent(parent) {
      // Find and select the parent in search results
      const parentResult = this.hierarchicalSearchResults.results.find(
        (r) => r?.name === parent?.name && r?.type === parent?.type
      );

      if (parentResult) {
        this.selectHierarchicalResult(parentResult);
      }
    },

    getLevelIcon(level) {
      const icons = {
        region: "fas fa-map",
        district: "fas fa-layer-group",
        commune: "fas fa-building",
        fokontany: "fas fa-home",
      };
      return icons[level] || "fas fa-map-marker-alt";
    },

    getChildType(parentType) {
      const hierarchy = {
        region: "district",
        district: "commune",
        commune: "fokontany",
        fokontany: null,
      };
      return hierarchy[parentType];
    },

    loadAllChildren(selectedHierarchicalResult) {
      console.log(loadAllChildren(selectedHierarchicalResult));
    },

    // Quick action methods
    viewOnMap(result) {
      console.log("View on map:", result);
      // Implement map integration
    },

    viewStatistics(result) {
      console.log("View statistics:", result);
      // Implement statistics view
    },

    copyHierarchy(result) {
      console.log(result);

      const hierarchyText = this.formatHierarchyText(result);
      navigator.clipboard.writeText(hierarchyText);
      alert("Hierarchy copied to clipboard!");
    },

    compareWithOther(result) {
      console.log("Compare:", result);
      // Implement comparison feature
    },

    formatHierarchyText(result) {
      let text = `${result?.type.toUpperCase()}: ${result?.name}\n\n`;

      if (result?.hierarchyPath.length > 0) {
        text += "Part of:\n";
        result.hierarchyPath.forEach((parent, i) => {
          text += `${"  ".repeat(i)}${
            parent?.type ? parent?.type : "fokontany"
          }: ${parent?.name}\n`;
        });
      }

      if (result.children && result.children.length > 0) {
        text += "\nContains:\n";
        this.sortRegionsByName(result.children).forEach((child, i) => {
          text += `  ${this.getChildType(result?.type)}: ${child?.name}\n`;
        });
      }

      return text;
    },
    _validateSliderDependancy() {
      if (
        typeof Slider === "undefined" &&
        !(typeof window !== "undefined" && typeof window.Slider !== "undefined")
      ) {
        throw new ReferenceError(
          "Required dependency 'custom-w3script.js' not found."
        );
      }
    },
  }));
};
