import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const TOPICS = {
  python: {
    label: "Python",
    jsonPath: "data/python.json",
    urlPath: "data/python-urls.json",
    title: "Python Knowledge Map",
    description:
      "A practical Python roadmap covering core syntax, data structures, functions, object-oriented programming, testing, packaging, and common ecosystem tooling."
  },
  node: {
    label: "Node.js",
    jsonPath: "data/node.json",
    urlPath: "data/nodejs-urls.json",
    title: "Node.js Knowledge Map",
    description:
      "A Node.js learning map focused on runtime fundamentals, modules, asynchronous programming, streams, APIs, and production-ready backend practices."
  },
  java: {
    label: "Java",
    jsonPath: "data/java.json",
    urlPath: "data/java-urls.json",
    title: "Java Knowledge Map",
    description:
      "A Java topic map spanning JVM foundations, object-oriented design, collections, exceptions, modern Java features, build tooling, and enterprise development."
  },
  javascript: {
    label: "JavaScript",
    jsonPath: "data/javascript.json",
    urlPath: "data/javascript-urls.json",
    title: "JavaScript Knowledge Map",
    description:
      "A JavaScript learning map covering language fundamentals, asynchronous patterns, DOM APIs, modules, tooling, and security/performance best practices."
  }
};

const DEFAULT_TOPIC = "python";

const THEME_STORAGE_KEY = "knowledge-map-theme";
const ZOOM_SCALE_MIN = 0.6;
const ZOOM_SCALE_MAX = 6;
const ZOOM_STEP = 1.2;
let currentTopic = null;
let currentZoomTransform = d3.zoomIdentity;

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getPreferredTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    const isDark = nextTheme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

function initializeTheme() {
  applyTheme(getPreferredTheme());

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    if (currentTopic) {
      render(currentTopic);
    }
  });
}

function initializeZoomControls() {
  const zoomInButton = document.getElementById("zoom-in");
  const zoomOutButton = document.getElementById("zoom-out");
  const zoomResetButton = document.getElementById("zoom-reset");

  if (!zoomInButton || !zoomOutButton || !zoomResetButton) return;

  zoomInButton.addEventListener("click", () => {
    const svg = document.querySelector("#chart-container svg");
    svg?.dispatchEvent(new CustomEvent("chart-zoom-in"));
  });

  zoomOutButton.addEventListener("click", () => {
    const svg = document.querySelector("#chart-container svg");
    svg?.dispatchEvent(new CustomEvent("chart-zoom-out"));
  });

  zoomResetButton.addEventListener("click", () => {
    const svg = document.querySelector("#chart-container svg");
    svg?.dispatchEvent(new CustomEvent("chart-zoom-reset"));
  });
}

function getTopicFromURL() {
  const topic = new URLSearchParams(window.location.search).get("topic");
  return topic && TOPICS[topic] ? topic : DEFAULT_TOPIC;
}


function sanitizeExternalUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function updateURL(topic) {
  const url = new URL(window.location.href);
  url.searchParams.set("topic", topic);
  window.history.replaceState({}, "", url);
}

function setLoading(message) {
  const container = document.getElementById("chart-container");
  container.innerHTML = `<p class=\"status\">${message}</p>`;
}

function setError(message) {
  const container = document.getElementById("chart-container");
  container.innerHTML = `<p class=\"status status-error\">${message}</p>`;
}

function renderTopicContent(topic) {
  const { title, description } = TOPICS[topic];
  document.getElementById("topic-title").textContent = title;
  document.getElementById("topic-description").textContent = description;
  document.title = title;
}

function renderButtons(activeTopic) {
  const group = document.getElementById("topic-buttons");
  group.innerHTML = "";

  for (const [topic, config] of Object.entries(TOPICS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-button${topic === activeTopic ? " is-active" : ""}`;
    button.textContent = config.label;
    button.setAttribute("aria-pressed", String(topic === activeTopic));
    button.addEventListener("click", () => {
      if (topic !== activeTopic) {
        currentZoomTransform = d3.zoomIdentity;
        render(topic);
      }
    });
    group.appendChild(button);
  }
}

function Tree(data, {
  label,
  title,
  width = 1152,
  height = 1152,
  margin = 100,
  stroke = "#555",
  strokeWidth = 1.5,
  strokeOpacity = 0.4,
  fill = "#999",
  r = 3,
  halo = "#fff",
  haloWidth = 3,
  textFill = "currentColor",
  initialTransform = d3.zoomIdentity,
  onZoomChange = () => {}
} = {}) {
  const radius = Math.min(width - margin * 2, height - margin * 2) / 2;
  const root = d3.hierarchy(data);

  const descendants = root.descendants();
  const labels = label ? descendants.map((d) => label(d.data, d)) : null;

  d3.tree().size([2 * Math.PI, radius]).separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)(root);

  const svg = d3.create("svg")
    .attr("viewBox", [-margin - radius, -margin - radius, width, height])
    .attr("width", "100%")
    .attr("height", "auto")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("style", "width: 100%; height: auto; display: block;")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("role", "img")
    .attr("aria-label", "Zoomable radial knowledge map");

  const zoomLayer = svg.append("g");

  zoomLayer
    .append("g")
    .attr("fill", "none")
    .attr("stroke", stroke)
    .attr("stroke-opacity", strokeOpacity)
    .attr("stroke-width", strokeWidth)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("d", d3.linkRadial().angle((d) => d.x).radius((d) => d.y));

  const node = zoomLayer
    .append("g")
    .selectAll("g")
    .data(descendants)
    .join("g")
    .attr("transform", (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

  node.append("circle").attr("fill", (d) => (d.children ? stroke : fill)).attr("r", r);

  if (title) {
    node.append("title").text((d) => title(d.data, d));
  }

  if (labels) {
    const labelContainer = node
      .append("a")
      .attr("href", (d) => sanitizeExternalUrl(d.data.url))
      .attr("target", (d) => (sanitizeExternalUrl(d.data.url) ? "_blank" : null))
      .attr("rel", (d) => (sanitizeExternalUrl(d.data.url) ? "noopener noreferrer" : null))
      .attr("referrerpolicy", (d) => (sanitizeExternalUrl(d.data.url) ? "no-referrer" : null));

    labelContainer
      .append("text")
      .attr("transform", (d) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
      .attr("dy", "0.32em")
      .attr("x", (d) => (d.x < Math.PI === !d.children ? 6 : -6))
      .attr("text-anchor", (d) => (d.x < Math.PI === !d.children ? "start" : "end"))
      .attr("paint-order", "stroke")
      .attr("stroke", halo)
      .attr("stroke-width", haloWidth)
      .attr("fill", textFill)
      .style("cursor", (d) => (sanitizeExternalUrl(d.data.url) ? "pointer" : "default"))
      .style("text-decoration", (d) => (sanitizeExternalUrl(d.data.url) ? "underline" : "none"))
      .text((d, i) => labels[i]);
  }

  const zoomBehavior = d3.zoom()
    .scaleExtent([ZOOM_SCALE_MIN, ZOOM_SCALE_MAX])
    .on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
      onZoomChange(event.transform);
    });

  svg.call(zoomBehavior).on("dblclick.zoom", null);
  svg.call(zoomBehavior.transform, initialTransform);

  svg.node().addEventListener("chart-zoom-in", () => {
    svg.transition().duration(150).call(zoomBehavior.scaleBy, ZOOM_STEP);
  });

  svg.node().addEventListener("chart-zoom-out", () => {
    svg.transition().duration(150).call(zoomBehavior.scaleBy, 1 / ZOOM_STEP);
  });

  svg.node().addEventListener("chart-zoom-reset", () => {
    svg.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity);
  });

  return svg.node();
}

function buildUrlLookup(urlTree) {
  const lookup = new Map();

  function walk(node, parentPath = "") {
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;

    lookup.set(currentPath, {
      url: node.url,
      resources: Array.isArray(node.resources) ? node.resources : undefined
    });

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child, currentPath);
      }
    }
  }

  walk(urlTree);
  return lookup;
}

function mergeUrlsIntoTree(topicTree, urlTree) {
  const lookup = buildUrlLookup(urlTree);

  function walk(node, parentPath = "") {
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
    const metadata = lookup.get(currentPath);

    const safeUrl = sanitizeExternalUrl(metadata?.url);
    if (safeUrl) {
      node.url = safeUrl;
    }

    if (metadata?.resources) {
      node.resources = metadata.resources;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child, currentPath);
      }
    }
  }

  walk(topicTree);
  return topicTree;
}

async function render(topic) {
  const normalizedTopic = TOPICS[topic] ? topic : DEFAULT_TOPIC;
  const config = TOPICS[normalizedTopic];
  currentTopic = normalizedTopic;

  renderTopicContent(normalizedTopic);
  renderButtons(normalizedTopic);
  updateURL(normalizedTopic);
  setLoading(`Loading ${config.label} map…`);

  try {
    const [topicResponse, urlResponse] = await Promise.all([
      fetch(config.jsonPath),
      fetch(config.urlPath)
    ]);

    if (!topicResponse.ok) {
      throw new Error(`HTTP ${topicResponse.status}`);
    }

    if (!urlResponse.ok) {
      throw new Error(`HTTP ${urlResponse.status}`);
    }

    const [data, urlData] = await Promise.all([topicResponse.json(), urlResponse.json()]);
    mergeUrlsIntoTree(data, urlData);
    const chart = Tree(data, {
      label: (d) => d.name,
      title: (d, node) => node.ancestors().reverse().map((ancestor) => ancestor.data.name).join(" > "),
      width: 1152,
      height: 1152,
      margin: 100,
      stroke: getCssVar("--tree-stroke"),
      fill: getCssVar("--tree-fill"),
      halo: getCssVar("--tree-halo"),
      textFill: getCssVar("--tree-label"),
      initialTransform: currentZoomTransform,
      onZoomChange: (transform) => {
        currentZoomTransform = transform;
      }
    });

    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    container.append(chart);
  } catch (error) {
    console.error("Failed to load topic map", error);
    setError(`Sorry, we couldn't load the ${config.label} map right now. Please try again.`);
  }
}

initializeTheme();
initializeZoomControls();
render(getTopicFromURL());
