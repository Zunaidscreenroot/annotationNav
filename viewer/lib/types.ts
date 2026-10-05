export type AnnotationRecord = {
  key: string;
  index: number;
  pageId: string;
  pageName: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  screenName: string;
  nodePath: string;
  label: string;
  labelMarkdown: string | null;
  properties: string[];
  categoryId: string | null;
  categoryLabel: string | null;
  figmaUrl: string | null;
};

export type HandoffPayload = {
  schemaVersion: number;
  product: string;
  fileKey: string | null;
  fileName: string;
  pageId: string;
  pageName: string;
  generatedAt: string;
  annotations: AnnotationRecord[];
};
