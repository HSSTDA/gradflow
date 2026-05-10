'use client';

// ─── Types & config ───────────────────────────────────────────────────────────
export interface ModalFile {
  name: string;
  size: string;
  date: string;
  type: 'pdf' | 'docx' | 'pptx';
}

export const FILE_ICON: Record<ModalFile['type'], { bg: string; emoji: string }> = {
  pdf:  { bg: 'var(--red-light)',    emoji: '📄' },
  docx: { bg: 'var(--blue-light)',   emoji: '📝' },
  pptx: { bg: 'var(--accent-light)', emoji: '📊' },
};

interface PreviewModalProps {
  file: ModalFile | null;
  onClose: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function PreviewModal({ file, onClose }: PreviewModalProps) {
  if (!file) return null;

  const icon = FILE_ICON[file.type];

  const viewerNote =
    file.type === 'pdf'
      ? 'PDF viewer will render inline once a file URL is available'
      : 'Google Docs Viewer will render this file inline';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[6px]"
      onClick={onClose}
    >
      {/* Modal box */}
      <div
        className="bg-[var(--surface)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(860px, 92vw)',
          height: 'min(600px, 88vh)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 shrink-0 border-b border-[var(--border)] flex items-center gap-3 px-5">
          {/* File icon */}
          <div
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[15px]"
            style={{ background: icon.bg }}
          >
            {icon.emoji}
          </div>

          {/* File name */}
          <span className="flex-1 min-w-0 text-[14px] font-bold text-[var(--text-primary)] truncate">
            {file.name}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-lg px-3 py-1.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors [transition:var(--transition)]">
              Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] [transition:var(--transition)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        {/*
          To enable real preview:
          PDF → <iframe src={fileUrl} />
          DOCX/PPTX → <iframe src={`https://docs.google.com/gviewer?url=${encodeURIComponent(fileUrl)}&embedded=true`} />
        */}
        <div className="flex-1 bg-[var(--bg)] flex flex-col items-center justify-center gap-3 overflow-hidden">
          <span className="text-[48px] leading-none select-none">{icon.emoji}</span>
          <p className="text-[16px] font-bold text-[var(--text-primary)]">{file.name}</p>
          <p className="text-[14px] text-[var(--text-muted)] text-center">
            Preview available after file is uploaded
          </p>
          <p className="text-[12px] text-[var(--text-muted)] text-center">{viewerNote}</p>
        </div>
      </div>
    </div>
  );
}
