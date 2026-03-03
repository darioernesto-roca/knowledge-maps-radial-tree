# Knowledge Maps Radial Tree

Interactive radial tree visualizations for language learning roadmaps, rendered with D3.

## Run locally

```sh
npx http-server
```

Then open `http://localhost:8080` (or the port shown by `http-server`).

## Zoom and pan navigation

The radial map supports interactive navigation so users can inspect dense text without changing base font size:

- **Mouse wheel / trackpad pinch** to zoom in and out.
- **Drag** to pan the map.
- Toolbar controls: **−** (zoom out), **Reset** (return to default view), **+** (zoom in).

Zoom state is preserved while switching theme mode for the same topic.

## Supported language maps

The app currently ships with:

- Python (`data/python.json` + `data/python-urls.json`)
- Node.js (`data/node.json` + `data/nodejs-urls.json`)
- Java (`data/java.json` + `data/java-urls.json`)
- JavaScript (`data/javascript.json` + `data/javascript-urls.json`)

You can switch maps via the topic buttons or by URL query param:

- `?topic=python`
- `?topic=node`
- `?topic=java`
- `?topic=javascript`

---

## JSON format used by maps

Each map is a hierarchical JSON object using the same shape:

```json
{
  "name": "Language Name",
  "children": [
    {
      "name": "Category",
      "children": [
        { "name": "Topic" },
        { "name": "Another Topic" }
      ]
    }
  ]
}
```

Rules:

1. Root object has a `name` and optional `children`.
2. Every node is `{ "name": string }`.
3. Branch nodes include `children` as an array of nodes.
4. Leaf nodes only need `name`.
5. Optional metadata per node: `url` (primary link) and `resources` (array of `{ label, url }`).

The rendering logic in `app.js` reads this hierarchy and builds a radial tree with `d3.hierarchy` + `d3.tree`, so all languages must keep this structure.

### URL metadata files (`*-urls.json`)

Each topic now also has a companion URL metadata file (for example, `data/javascript-urls.json`).

- The URL file mirrors the same hierarchy/paths as the main map file.
- The app merges URL metadata into the main tree at runtime by full path (`Root > Category > Topic`).
- Node labels with a `url` become clickable in the radial map and open in a new tab.

Example URL metadata node:

```json
{
  "name": "Array.map()",
  "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
  "resources": [
    { "label": "MDN", "url": "https://developer.mozilla.org/..." }
  ]
}
```

---

## How to add a new language map manually (developer guide)

### 1) Create the JSON data file

Create a new file under `data/`:

- Example: `data/rust.json`

Use the same hierarchical structure shown above. Keep naming concise and topic-focused.

Create a companion URL metadata file too:

- Example: `data/rust-urls.json`
- Keep node names/paths aligned with `data/rust.json` so URL merging works correctly.

### 2) Register the language in `app.js`

Open `app.js` and add a new entry in the `TOPICS` object:

```js
rust: {
  label: "Rust",
  jsonPath: "data/rust.json",
  urlPath: "data/rust-urls.json",
  title: "Rust Knowledge Map",
  description: "A Rust roadmap covering ownership, borrowing, lifetimes, traits, async, and tooling."
}
```

What each field does:

- `label`: button label in the UI.
- `jsonPath`: roadmap hierarchy loaded via `fetch`.
- `urlPath`: URL metadata tree loaded via `fetch` and merged into the roadmap by node path.
- `title`: page `<title>` + on-page heading.
- `description`: subtitle text shown under heading.

### 3) (Optional) Set the new default language

In `app.js`, update:

```js
const DEFAULT_TOPIC = "python";
```

Replace with your new topic key if you want the app to open there by default.

### 4) Verify in browser

Run `npx http-server` and open:

- `http://localhost:8080/?topic=rust`

Confirm:

- The new button appears.
- The title/description updates.
- The radial tree renders without errors.
- Zoom controls (`−`, `Reset`, `+`) work and wheel/pinch + drag interactions respond.

### 5) Commit both code + data changes

For a new language, the minimum expected files changed are:

- `data/<language>.json`
- `data/<language>-urls.json`
- `app.js`
- `README.md` (update supported languages + instructions)

---

## Implementation notes

- Rendering happens in `Tree(...)` within `app.js`.
- The SVG chart uses D3 zoom with scale limits and panning support.
- The chart SVG is responsive (`width="100%"`, `height="auto"`) and scales to the available horizontal space.
- Topic selection is URL-driven (`topic` query param).
- Failed JSON loads are handled with a user-facing error message.
- Main map JSON and URL metadata JSON are fetched together and merged by node path at runtime.
- Labels are rendered as links when a node has a `url`.
