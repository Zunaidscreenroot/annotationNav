'use client';

import { useEffect, useMemo, useState } from "react";
import type { AnnotationRecord, HandoffPayload } from "../../../lib/types";

function embedUrl(fileKey: string | null, nodeId: string | null) {
  if (!fileKey) return null;

  const params = new URLSearchParams();
  params.set("embed-host", "annotationnav");
  params.set("footer", "false");
  params.set("viewport-controls", "true");
  params.set("page-selector", "false");

  if (nodeId) params.set("node-id", nodeId.replace(/:/g, "-"));

  return "https://embed.figma.com/design/" + encodeURIComponent(fileKey) + "?" + params.toString();
}

function matches(a: AnnotationRecord, query: string, category: string) {
  const haystack = [
    a.label,
    a.labelMarkdown || "",
    a.nodeName,
    a.nodePath,
    a.screenName,
    a.categoryLabel || "",
    ...a.properties,
  ].join(" ").toLowerCase();

  return (
    (!query || haystack.includes(query.toLowerCase())) &&
    (category === "ALL" || a.categoryLabel === category)
  );
}

export default function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) =>
      fetch("/api/handoffs/" + encodeURIComponent(id), { cache: "no-store" })
        .then(async response => {
          if (!response.ok) throw new Error("Handoff not found");
          return response.json() as Promise<HandoffPayload>;
        })
        .then(data => {
          if (cancelled) return;
          setPayload(data);
          if (data.annotations[0]) setSelectedNodeId(data.annotations[0].nodeId);
        })
        .catch(err => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load handoff.");
        })
    );

    return () => { cancelled = true; };
  }, [params]);

  const categories = useMemo(() => {
    if (!payload) return [];
    return [...new Set(payload.annotations.map(a => a.categoryLabel).filter(Boolean) as string[])].sort();
  }, [payload]);

  const visible = useMemo(
    () => payload ? payload.annotations.filter(a => matches(a, query, category)) : [],
    [payload, query, category]
  );

  const groups = useMemo(() => {
    const map = new Map<string, AnnotationRecord[]>();
    for (const annotation of visible) {
      const key = annotation.screenName || "Other";
      const list = map.get(key) || [];
      list.push(annotation);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [visible]);

  if (error) {
    return <main className="errorPage"><div className="errorCard"><h1>Handoff unavailable</h1><p>{error}. Ask the designer to generate a new AnnotationNav link.</p></div></main>;
  }

  if (!payload) return <main className="loading">Loading developer handoff…</main>;

  const currentEmbedUrl = embedUrl(payload.fileKey, selectedNodeId);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">A</div>
          <div>
            <div className="brandTitle">AnnotationNav</div>
            <div className="brandSub">{payload.fileName} · {payload.pageName}</div>
          </div>
        </div>
        <div className="topActions">
          <button className="topBtn" onClick={copyLink}>Copy handoff link</button>
          {payload.fileKey && (
            <a className="topBtn" href={"https://www.figma.com/design/" + encodeURIComponent(payload.fileKey)} target="_blank" rel="noreferrer">
              Open Figma
            </a>
          )}
        </div>
      </header>

      <section className="app">
        <div className="canvas">
          {currentEmbedUrl ? (
            <iframe
              title="Figma design"
              src={currentEmbedUrl}
              allowFullScreen
            />
          ) : (
            <div className="empty"><div><strong>Figma embed unavailable</strong><span>This handoff does not contain a Figma file key.</span></div></div>
          )}
        </div>

        <aside className="panel">
          <div className="panelHead">
            <div className="pageLine">
              <div>
                <div className="pageTitle">Implementation annotations</div>
                <div className="pageMeta">{payload.pageName} · exported {new Date(payload.generatedAt).toLocaleString()}</div>
              </div>
              <div className="badge">{payload.annotations.length} total</div>
            </div>
          </div>

          <div className="controls">
            <input
              className="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search annotations, screens, nodes…"
            />
            <div className="chips">
              <button className={"chip " + (category === "ALL" ? "active" : "")} onClick={() => setCategory("ALL")}>All</button>
              {categories.map(item => (
                <button
                  key={item}
                  className={"chip " + (category === item ? "active" : "")}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="list">
            {groups.length === 0 ? (
              <div className="empty"><div><strong>No matching annotations</strong><span>Try a different search or category.</span></div></div>
            ) : (
              groups.map(([group, annotations]) => (
                <section className="group" key={group}>
                  <div className="groupTitle">{group} · {annotations.length}</div>
                  {annotations.map(annotation => (
                    <article
                      className={"card " + (selectedNodeId === annotation.nodeId ? "active" : "")}
                      key={annotation.key}
                      onClick={() => setSelectedNodeId(annotation.nodeId)}
                    >
                      <div className="cardTop">
                        <span className="category">{annotation.categoryLabel || "Annotation"}</span>
                        <span className="number">#{annotation.index + 1}</span>
                      </div>
                      <div className="cardText">{annotation.label}</div>
                      <div className="cardPath">{annotation.nodePath || annotation.nodeName}</div>
                      {annotation.figmaUrl && (
                        <div className="cardActions">
                          <a
                            className="linkBtn"
                            href={annotation.figmaUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={event => event.stopPropagation()}
                          >
                            Open in Figma ↗
                          </a>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
