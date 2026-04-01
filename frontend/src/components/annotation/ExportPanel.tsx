import { useState } from 'react';
import { message } from 'antd';
import useAnnotationStore from '../../store/annotationStore';
import { exportCOCO, exportYOLO, exportDasshineJSON, downloadJSON, downloadText } from '../../utils/exportUtils';

const FORMATS = [
  { id: 'dasshine', label: 'Dasshine JSON', desc: '2D + 3D 原生格式', ext: '.json' },
  { id: 'coco',     label: 'COCO JSON',     desc: 'MS COCO 格式',   ext: '.json' },
  { id: 'yolo',     label: 'YOLO TXT',      desc: 'Darknet YOLO',   ext: '.txt'  },
] as const;

type FormatId = typeof FORMATS[number]['id'];

interface ExportPanelProps {
  taskId?: string;
  imageName?: string;
  imageWidth?: number;
  imageHeight?: number;
  onClose?: () => void;
}

export default function ExportPanel({
  taskId = '1001',
  imageName = 'image.jpg',
  imageWidth = 1280,
  imageHeight = 720,
  onClose,
}: ExportPanelProps) {
  const [selected, setSelected] = useState<FormatId>('dasshine');
  const { annotations2d, boxes3d, labelClasses } = useAnnotationStore();

  function handleExport() {
    switch (selected) {
      case 'dasshine': {
        const data = exportDasshineJSON(annotations2d, boxes3d, taskId, imageName);
        downloadJSON(data, `${taskId}_dasshine.json`);
        break;
      }
      case 'coco': {
        const data = exportCOCO(annotations2d, imageWidth, imageHeight, imageName, labelClasses);
        downloadJSON(data, `${taskId}_coco.json`);
        break;
      }
      case 'yolo': {
        const text = exportYOLO(annotations2d, imageWidth, imageHeight, labelClasses);
        downloadText(text, `${taskId}.txt`);
        break;
      }
    }
    message.success({ content: '导出成功', className: 'annotation-message' });
    onClose?.();
  }

  const count2d = annotations2d.length;
  const count3d = boxes3d.length;

  return (
    <div className="w-72 bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white/80">导出标注</span>
        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* stats */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1e1e2e]">
          <div className="text-[10px] text-white/30 mb-1">2D 标注</div>
          <div className="text-lg font-mono text-[#00d4ff]">{count2d}</div>
        </div>
        <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1e1e2e]">
          <div className="text-[10px] text-white/30 mb-1">3D 框</div>
          <div className="text-lg font-mono text-[#a78bfa]">{count3d}</div>
        </div>
      </div>

      {/* format select */}
      <div className="space-y-1.5 mb-4">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">导出格式</div>
        {FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => setSelected(fmt.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
              ${selected === fmt.id
                ? 'bg-[#00d4ff]/10 ring-1 ring-[#00d4ff]/30'
                : 'bg-[#0a0a0f] border border-[#1e1e2e] hover:border-white/20'}
            `}
          >
            <div className="w-8 h-8 rounded bg-[#1e1e2e] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-mono text-white/50">{fmt.ext}</span>
            </div>
            <div>
              <div className={`text-xs font-medium ${selected === fmt.id ? 'text-[#00d4ff]' : 'text-white/70'}`}>
                {fmt.label}
              </div>
              <div className="text-[10px] text-white/30">{fmt.desc}</div>
            </div>
            {selected === fmt.id && (
              <div className="ml-auto">
                <svg viewBox="0 0 16 16" fill="none" stroke="#00d4ff" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* export button */}
      <button
        onClick={handleExport}
        disabled={count2d === 0 && count3d === 0}
        className="
          w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
          bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30
          hover:bg-[#00d4ff]/25 hover:border-[#00d4ff]/50 active:scale-95
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-all
        "
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round"/>
        </svg>
        下载导出文件
      </button>
    </div>
  );
}
