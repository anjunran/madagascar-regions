// slider.js
const Slider = (() => {
  const DEFAULTS = {
    selector: null,
    autoSlide: false,
    interval: 0,
  };

  return class {
    constructor(options = {}) {
      const { selector, autoSlide, interval } = { ...DEFAULTS, ...options };
      this.selector = selector;
      this.autoSlide = Boolean(autoSlide);
      this.interval =
        this.autoSlide && typeof interval === "number"
          ? interval
          : DEFAULTS.interval;
      this._engine = null;
      this._validateW3Dependency();
      if (this.selector) {
        this.init();
      }
    }

    init(selector = null) {
      if (selector) {
        this.selector = selector;
      }
      if (!this.selector) {
        throw new Error("Slider: No selector specified.");
      }
      const intervalArg = this.autoSlide ? this.interval : 0;
      this._engine = w3.slideshow(this.selector, intervalArg);
      return this;
    }

    next() {
      if (this._engine) {
        this._engine.next();
      } else {
        console.warn("Slider.next(): engine not initialized");
      }
      return this;
    }

    previous() {
      if (this._engine) {
        this._engine.previous();
      } else {
        console.warn("Slider.previous(): engine not initialized");
      }
      return this;
    }

    goTo(index) {
      if (this._engine && typeof index == "number") {
        this._engine.jumpTo(index);
      } else {
        console.warn("Slider.goTo(): invalid engine or index");
      }

      return this;
    }

    isActive() {
      return !!this._engine;
    }

    _validateW3Dependency() {
      if (
        typeof w3 === "undefined" &&
        !(typeof window !== "undefined" && typeof window.w3 !== "undefined")
      ) {
        throw new ReferenceError("Required dependency 'w3.js' not found.");
      }
    }
  };
})();

function w3_searchBar_open() {
  document.getElementById("searchSidebar").style.display = "block";
}

function w3_searchBar_close() {
  document.getElementById("searchSidebar").style.display = "none";
}

