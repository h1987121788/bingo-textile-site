const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const optionValues = (file) => {
  const select = read(file).match(/<select name="garment_type"[^>]*>([\s\S]*?)<\/select>/);
  assert(select, `${file}: missing garment type select`);
  return [...select[1].matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)]
    .map((match) => match[1] ?? match[2]);
};

// Run the real browser script with only the DOM and storage it needs.
function harness(search = "?collection=core", saved = []) {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset;
      this.attributes = {};
      this.listeners = {};
      this.children = [];
      const classes = new Set();
      this.classList = {
        contains: (name) => classes.has(name),
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        toggle: (name, force = !classes.has(name)) => {
          force ? classes.add(name) : classes.delete(name);
          return force;
        },
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    querySelectorAll() { return []; }
    closest() { return this; }
    hasAttribute(name) {
      const key = name.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      return Object.hasOwn(this.dataset, key);
    }
    showModal() { this.open = true; }
    close() { this.open = false; }
    scrollIntoView() {}
    focus() {}
    set innerHTML(value) {
      this.html = value;
      if (this.isFilters)
        this.children = [...value.matchAll(/data-family="([^"]+)"/g)]
          .map((match) => new Element({ family: match[1] }));
    }
    get innerHTML() { return this.html || ""; }
  }
  const selectors = [
    "[data-catalog-grid]", "[data-result-count]", "[data-catalog-empty]",
    "[data-collection-note]", "#collection-panel", ".category-filters",
    "#product-dialog", "#inquiry-dialog", "#contact", "[data-product-dialog-content]",
    "[data-inquiry-items]", "[data-continue-inquiry]", "[data-toast]",
    "[data-menu-toggle]", "#main-nav", "[data-catalog-search]",
    "[data-catalog-sort]", 'input[name="reference"]',
    'input[name="brand"]', 'select[name="garment_type"]',
  ];
  const nodes = new Map(selectors.map((selector) => [selector, new Element()]));
  nodes.get(".category-filters").isFilters = true;
  const type = nodes.get('select[name="garment_type"]');
  const options = optionValues("garments.html");
  let typeValue = "";
  Object.defineProperty(type, "value", {
    get: () => typeValue,
    set: (value) => { typeValue = options.includes(value) ? value : ""; },
  });
  const tabs = [new Element({ collection: "aw26" }), new Element({ collection: "core" })];
  const document = new Element();
  document.querySelector = (selector) => nodes.get(selector) || null;
  document.querySelectorAll = (selector) => {
    if (selector === "[data-family]") return nodes.get(".category-filters").children;
    if (selector === "[data-collection]") return tabs;
    return [];
  };
  const stored = new Map([["bingoShowroomInquiryV2", JSON.stringify(saved)]]);
  const context = {
    document, console, URLSearchParams, location: { search },
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    sessionStorage: { setItem() {} },
    setTimeout: () => 1, clearTimeout() {},
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ["garment-data.js", "garment-review-status.js", "aw26-product-data.js", "showroom.js"])
    vm.runInContext(read(file), context, { filename: file });
  const click = (dataset) => document.listeners.click({ target: new Element(dataset) });
  return {
    click,
    nodes,
    context,
    categories: () => nodes.get(".category-filters").children.map((button) => button.dataset.family),
    codes: () => [...nodes.get("[data-catalog-grid]").innerHTML.matchAll(/data-style-code="([^"]+)"/g)].map((match) => match[1]),
    prepare: (codes) => {
      codes.forEach((code) => click({ toggleStyle: code }));
      click({ continueInquiry: "" });
      return type.value;
    },
  };
}

test("all 47 core products belong to the correct reachable category", () => {
  const page = harness();
  const code = (number) => `BG-GM-${String(number).padStart(3, "0")}`;
  const groups = {
    tanks: [1, 21, 24, 27, 30, 33],
    shorts: [2, 39, 44, 46],
    pants: [10, 37, 42],
    sets: [5, 9, 43],
    hoodies: [11, 20, 40],
    "long-sleeves": [41, 45],
  };
  const assigned = new Set(Object.values(groups).flat());
  groups["t-shirts"] = Array.from({ length: 47 }, (_, index) => index + 1)
    .filter((number) => !assigned.has(number));
  assert.equal(page.codes().length, 47);
  assert.deepEqual(new Set(page.categories()), new Set(["all", ...Object.keys(groups)]));
  for (const [family, numbers] of Object.entries(groups)) {
    page.click({ family });
    assert.deepEqual(new Set(page.codes()), new Set(numbers.map(code)), family);
  }
  page.click({ family: "all" });
  assert.equal(new Set(page.codes()).size, 47);
});

test("collection switches preserve all 20 AW26 styles and use appropriate filters", () => {
  const page = harness();
  page.click({ family: "shorts" });
  page.click({ collection: "aw26" });
  assert.equal(page.codes().length, 20);
  assert.deepEqual(page.categories(), ["all", "long-sleeves", "sweatshirts", "hoodies", "thermal"]);
  const found = new Set();
  for (const family of page.categories().filter((value) => value !== "all")) {
    page.click({ family });
    assert(page.codes().length > 0, family);
    page.codes().forEach((code) => {
      assert(!found.has(code), `duplicate classification: ${code}`);
      found.add(code);
    });
  }
  assert.equal(found.size, 20);
  page.click({ collection: "core" });
  assert.equal(page.codes().length, 47);
  assert(page.categories().includes("pants"));
  assert(!page.categories().includes("thermal"));
});

test("category deep links work and unsupported categories safely show all styles", () => {
  assert.equal(harness("?collection=core&category=shorts").codes().length, 4);
  assert.equal(harness("?collection=core&category=t-shirts").codes().length, 26);
  assert.equal(harness("?collection=core&category=unknown").codes().length, 47);
  assert.equal(harness("?category=shorts").codes().length, 20);
});

for (const [codes, expected] of [
  [["BG-GM-047"], "T-shirts"],
  [["BG-GM-001"], "Tanks / sleeveless tops"],
  [["BG-GM-041"], "Long-sleeve tops"],
  [["BG-GM-011"], "Sweatshirts / hoodies"],
  [["BG-GM-002"], "Shorts"],
  [["BG-GM-010"], "Pants"],
  [["BG-GM-043"], "Sets / tracksuits"],
  [["253"], "Sweatshirts / hoodies"],
  [["04C"], "Long-sleeve tops"],
  [["1108T"], "Thermal layers"],
  [["BG-GM-047", "BG-GM-006"], "T-shirts"],
  [["04C", "BG-GM-041"], "Long-sleeve tops"],
  [["253", "04C"], "AW26 mixed collection"],
  [["BG-GM-047", "BG-GM-010"], "Mixed garment collection"],
  [["253", "BG-GM-047"], "Mixed garment collection"],
]) {
  test(`inquiry type for ${codes.join(", ")} is ${expected}`, () => {
    const page = harness();
    assert.equal(page.prepare(codes), expected);
    assert.equal(page.nodes.get('input[name="reference"]').value, codes.join(", "));
  });
}

test("restored selections and removal recalculate type without stale AW26 classification", () => {
  const page = harness("", ["253", "BG-GM-047", "BG-GM-047", "unknown"]);
  page.click({ continueInquiry: "" });
  assert.equal(page.nodes.get('select[name="garment_type"]').value, "Mixed garment collection");
  page.click({ removeStyle: "253" });
  page.click({ continueInquiry: "" });
  assert.equal(page.nodes.get('select[name="garment_type"]').value, "T-shirts");
  assert.equal(page.nodes.get('input[name="reference"]').value, "BG-GM-047");
});

test("empty selection preserves a manually chosen custom inquiry type", () => {
  const page = harness();
  page.nodes.get('select[name="garment_type"]').value = "Full custom style";
  assert.equal(page.prepare([]), "Full custom style");
});

test("adding or removing styles immediately updates the type and clears the last automatic value", () => {
  const page = harness();
  const type = page.nodes.get('select[name="garment_type"]');
  page.click({ toggleStyle: "BG-GM-047" });
  assert.equal(type.value, "T-shirts");
  page.click({ toggleStyle: "BG-GM-010" });
  assert.equal(type.value, "Mixed garment collection");
  page.click({ removeStyle: "BG-GM-047" });
  assert.equal(type.value, "Pants");
  page.click({ removeStyle: "BG-GM-010" });
  assert.equal(type.value, "");
});

test("homepage and catalog offer identical inquiry types", () => {
  assert.deepEqual(optionValues("index.html"), optionValues("garments.html"));
});
