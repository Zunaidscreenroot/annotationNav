# Handoff API Contract

## POST /api/handoffs

Accept the JSON payload emitted by AnnotationNav.

Required top-level fields:

- `schemaVersion`
- `product`
- `fileKey`
- `fileName`
- `pageId`
- `pageName`
- `generatedAt`
- `annotations`

Each annotation should preserve:

- `key`
- `nodeId`
- `nodeName`
- `nodeType`
- `screenName`
- `nodePath`
- `label`
- `labelMarkdown`
- `properties`
- `categoryId`
- `categoryLabel`
- `figmaUrl`

Example response:

```json
{
  "id": "abc123",
  "url": "https://your-app.vercel.app/h/abc123"
}
```

The Vercel viewer should render the saved annotations beside the Figma Design embed and use the stored `figmaUrl` / `nodeId` to navigate the design location.

Make the endpoint accept POST requests from the Figma plugin environment and return JSON.