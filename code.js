const UI_WIDTH = 420;
const UI_HEIGHT = 760;

figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT });

function isSceneNode(node) {
  return !!node && node.type !== "DOCUMENT" && node.type !== "PAGE";
}

function cleanMarkdown(value) {
  if (!value) return "";
  return value.replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g, "").replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g, "$1").replace(/[*_~>#]/g, "").replace(/\\s+/g, " ").trim();
}

function getNodePath(node) {
  const parts = [];
  let current = node;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    parts.unshift(current.name);
    current = current.parent;
  }
  return parts.join(" / ");
}

function getScreenName(node) {
  let current = node;
  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (current.type === "FRAME" || current.type === "COMPONENT" || current.type === "COMPONENT_SET" || current.type === "SECTION") return current.name;
    current = current.parent;
  }
  return node.name || "Untitled";
}

function nodeIdForUrl(nodeId) {
  return String(nodeId).replace(/:/g, "-");
}

function getFigmaNodeUrl(fileKey, nodeId) {
  if (!fileKey) return null;
  return "https://www.figma.com/design/" + encodeURIComponent(fileKey) + "/?node-id=" + encodeURIComponent(nodeIdForUrl(nodeId));
}

function nodeY(node) {
  if (!node || !(("absoluteBoundingBox") in node) || !node.absoluteBoundingBox) return 0;
  return node.absoluteBoundingBox.y || 0;
}

async function scanCurrentPage() {
  const page = figma.currentPage;
  const categories = await figma.annotations.getAnnotationCategoriesAsync();
  const categoryMap = new Map(categories.map(category => [category.id, category]));

  const annotatedNodes = page.findAll(node => {
    return "annotations" in node && Array.isArray(node.annotations) && node.annotations.length > 0;
  });

  const annotations = [];

  for (const node of annotatedNodes) {
    const nodeAnnotations = node.annotations || [];
    nodeAnnotations.forEach((annotation, annotationIndex) => {
      const label = annotation.label || cleanMarkdown(annotation.labelMarkdown) || "Untitled annotation";
      const category = annotation.categoryId ? categoryMap.get(annotation.categoryId) : null;
      annotations.push({
        key: page.id + "::" + node.id + "::" + annotationIndex,
        index: annotationIndex,
        pageId: page.id,
        pageName: page.name,
        nodeId: node.id,
        nodeName: node.name || "Unnamed node",
        nodeType: node.type,
        screenName: getScreenName(node),
        nodePath: getNodePath(node),
        label: label,
        labelMarkdown: annotation.labelMarkdown || null,
        properties: Array.isArray(annotation.properties) ? annotation.properties.map(property => property.type) : [],
        categoryId: annotation.categoryId || null,
        categoryLabel: category ? category.label : null,
        figmaUrl: getFigmaNodeUrl(figma.fileKey, node.id)
      });
    });
  }

  annotations.sort((a, b) => {
    const byScreen = a.screenName.localeCompare(b.screenName);
    if (byScreen !== 0) return byScreen;
    const nodeA = annotatedNodes.find(node => node.id === a.nodeId);
    const nodeB = annotatedNodes.find(node => node.id === b.nodeId);
    const byY = nodeY(nodeA) - nodeY(nodeB);
    if (byY !== 0) return byY;
    return a.nodeName.localeCompare(b.nodeName);
  });

  return {
    schemaVersion: 1,
    product: "AnnotationNav",
    fileKey: figma.fileKey || null,
    fileName: figma.root.name,
    pageId: page.id,
    pageName: page.name,
    generatedAt: new Date().toISOString(),
    annotations
  };
}

async function sendState() {
  const payload = await scanCurrentPage();
  figma.ui.postMessage({ type: "annotations", payload });
  return payload;
}

async function getStoredEndpoint() {
  return (await figma.clientStorage.getAsync("annotationNavEndpoint")) || "";
}

async function createHandoff(endpoint, payload) {
  const url = String(endpoint || "").trim();
  if (!url) throw new Error("Add your Vercel handoff API URL first.");
  if (!/^https:\\/\\/[^\\s]+$/i.test(url)) throw new Error("Use an HTTPS URL for the handoff API.");
  await figma.clientStorage.setAsync("annotationNavEndpoint", url);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  let data = {};
  try { data = bodyText ? JSON.parse(bodyText) : {}; } catch (_error) { throw new Error("Handoff API returned a non-JSON response (" + response.status + ")."); }
  if (!response.ok) throw new Error(data && data.error ? data.error : "Handoff API failed with HTTP " + response.status);
  if (!data.url && !data.id) throw new Error("Handoff API response must include at least url or id.");
  return data;
}

figma.ui.onmessage = async message => {
  try {
    if (message.type === "refresh") { await sendState(); return; }

    if (message.type === "navigate") {
      const node = await figma.getNodeByIdAsync(message.nodeId);
      if (!isSceneNode(node)) {
        figma.ui.postMessage({ type: "error", message: "The source node no longer exists." });
        return;
      }
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.ui.postMessage({ type: "navigated", nodeId: node.id });
      return;
    }

    if (message.type === "getEndpoint") {
      const endpoint = await getStoredEndpoint();
      figma.ui.postMessage({ type: "endpoint", endpoint });
      return;
    }

    if (message.type === "createHandoff") {
      const payload = await scanCurrentPage();
      const result = await createHandoff(message.endpoint, payload);
      figma.ui.postMessage({ type: "handoffCreated", result });
      return;
    }
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: error && error.message ? error.message : String(error) });
  }
};

figma.on("selectionchange", () => {
  figma.ui.postMessage({ type: "selection", selectedIds: figma.currentPage.selection.map(node => node.id) });
});

figma.on("currentpagechange", async () => {
  try { await sendState(); }
  catch (error) {
    figma.ui.postMessage({ type: "error", message: error && error.message ? error.message : String(error) });
  }
});

sendState();
getStoredEndpoint().then(endpoint => figma.ui.postMessage({ type: "endpoint", endpoint }));