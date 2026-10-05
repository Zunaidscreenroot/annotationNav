# AnnotationNav

AnnotationNav is a separate Figma plugin for reading native Figma annotations and preparing them for a developer handoff.

## Flow

Designer runs AnnotationNav → native annotations are read → JSON is produced → your Vercel API can store the payload → developer opens the Vercel handoff page with the Figma embed and annotation panel.

## Plugin features

- Reads native `node.annotations` on the current page
- Shows annotation count and current page
- Searches annotation text, node, screen, category and pinned properties
- Filters by annotation category
- Groups annotations by screen/frame context
- Click an annotation to select and zoom to the exact source node
- Refreshes when the active Figma page changes
- Exports the page annotations as JSON
- Optionally POSTs the payload to a Vercel handoff API
- Does not create or edit native annotations
- Does not write a custom annotation database into the Figma file

## Install

1. Clone or download this repository.
2. In Figma: Plugins → Development → Import plugin from manifest.
3. Select `manifest.json`.
4. Run **AnnotationNav**.

## Vercel endpoint

Put your API endpoint into the **Create Handoff** field, for example:

`https://your-app.vercel.app/api/handoffs`

The plugin sends a schema-versioned JSON document containing the file key, current page, annotation text, category, pinned properties, node ID, node path and a Figma node URL.

Expected response:

```json
{
  "id": "abc123",
  "url": "https://your-app.vercel.app/h/abc123"
}
```

## Free-seat developer model

The developer does not need to run this plugin. The plugin is the **designer-side exporter**. Your separate Vercel handoff site is the **developer-side viewer**.

That viewer can show:

- a Figma Design embed
- an annotation list stored from this plugin
- search and filters
- an **Open in Figma** action per annotation

## API notes

Figma's current plugin model supports `documentAccess: dynamic-page` for new plugins, native `node.annotations`, and network access declarations in `manifest.json`.

See `handoff-api.md` for the API payload contract.