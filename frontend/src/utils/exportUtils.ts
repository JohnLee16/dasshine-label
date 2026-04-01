import { Annotation2D, Box3D, LabelClass } from '../store/annotationStore';

// ─── COCO format export ───────────────────────────────────────────────────────

export function exportCOCO(
  annotations: Annotation2D[],
  imageWidth: number,
  imageHeight: number,
  imageName: string,
  labelClasses: LabelClass[],
) {
  const categories = labelClasses.map((lc, i) => ({ id: i + 1, name: lc.name, supercategory: 'object' }));
  const catMap = Object.fromEntries(labelClasses.map((lc, i) => [lc.name, i + 1]));

  const cocoAnns = annotations.map((ann, idx) => {
    if (ann.type === 'bbox') {
      const [tl, br] = ann.points;
      const x = Math.min(tl.x, br.x), y = Math.min(tl.y, br.y);
      const w = Math.abs(br.x - tl.x), h = Math.abs(br.y - tl.y);
      return {
        id: idx + 1, image_id: 1,
        category_id: catMap[ann.label] ?? 1,
        bbox: [x, y, w, h],
        area: w * h,
        iscrowd: 0,
        score: ann.score,
      };
    }
    if (ann.type === 'polygon') {
      const xs = ann.points.map((p) => p.x);
      const ys = ann.points.map((p) => p.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      return {
        id: idx + 1, image_id: 1,
        category_id: catMap[ann.label] ?? 1,
        segmentation: [ann.points.flatMap((p) => [p.x, p.y])],
        bbox: [x, y, w, h],
        area: w * h,
        iscrowd: 0,
        score: ann.score,
      };
    }
    return null;
  }).filter(Boolean);

  return {
    info: { description: 'Dasshine Label Export', date_created: new Date().toISOString() },
    images: [{ id: 1, file_name: imageName, width: imageWidth, height: imageHeight }],
    annotations: cocoAnns,
    categories,
  };
}

// ─── YOLO format export ───────────────────────────────────────────────────────

export function exportYOLO(
  annotations: Annotation2D[],
  imageWidth: number,
  imageHeight: number,
  labelClasses: LabelClass[],
): string {
  const catMap = Object.fromEntries(labelClasses.map((lc, i) => [lc.name, i]));

  return annotations
    .filter((a) => a.type === 'bbox' && a.points.length >= 2)
    .map((ann) => {
      const [tl, br] = ann.points;
      const cx = ((tl.x + br.x) / 2) / imageWidth;
      const cy = ((tl.y + br.y) / 2) / imageHeight;
      const w  = Math.abs(br.x - tl.x) / imageWidth;
      const h  = Math.abs(br.y - tl.y) / imageHeight;
      const cls = catMap[ann.label] ?? 0;
      return `${cls} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`;
    })
    .join('\n');
}

// ─── Dasshine native JSON ─────────────────────────────────────────────────────

export function exportDasshineJSON(
  annotations2d: Annotation2D[],
  boxes3d: Box3D[],
  taskId: string,
  imageName: string,
) {
  return {
    version: '1.0',
    task_id: taskId,
    image: imageName,
    exported_at: new Date().toISOString(),
    annotations_2d: annotations2d.map((ann) => ({
      id: ann.id,
      type: ann.type,
      label: ann.label,
      points: ann.points,
      score: ann.score,
      is_ai: ann.isAI ?? false,
      attributes: ann.attributes ?? {},
    })),
    annotations_3d: boxes3d.map((box) => ({
      id: box.id,
      label: box.label,
      center: box.center,
      size: box.size,
      rotation: box.rotation,
      score: box.score,
      is_ai: box.isAI ?? false,
      attributes: box.attributes ?? {},
    })),
  };
}

// ─── Download helper ──────────────────────────────────────────────────────────

export function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
