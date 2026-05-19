'use client';

import { useState, useRef, useEffect } from 'react';
import { useFilesStore, type FileItem } from '@/store/filesStore';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useAuthStore } from '@/store/authStore';
import { getSupabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'list' | 'grid';

// ─── Data ─────────────────────────────────────────────────────────────────────
const FILE_ICON: Record<string, { bg: string; emoji: string }> = {
  pdf:  { bg: '#FEE2E2', emoji: '📄' },
  docx: { bg: '#DBEAFE', emoji: '📝' },
  pptx: { bg: '#FFF0E8', emoji: '📊' },
};

// ─── PreviewModal ─────────────────────────────────────────────────────────────
function PreviewModal({
  file, total, index, onClose, onPrev, onNext,
}: {
  file: FileItem; total: number; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const icon    = FILE_ICON[file.type] ?? { bg: '#F3F4F6', emoji: '📎' };
  const canPrev = index > 0;
  const canNext = index < total - 1;

  const ghostBtn: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '4px 10px',
    borderRadius: 6, background: 'transparent',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(820px, 90vw)', height: 'min(580px, 85vh)',
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          height: 48, flexShrink: 0,
          borderBottom: '1px solid var(--border)', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: icon.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              {icon.emoji}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {file.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={ghostBtn}>↓ Download</button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--text-muted)',
                padding: '4px 6px', lineHeight: 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>
          <iframe
            src={
              file.type === 'pdf'
                ? file.url
                : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
            }
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>

        {/* Footer */}
        <div style={{
          height: 36, flexShrink: 0,
          borderTop: '1px solid var(--border)', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {file.size} · {file.folder} · Added by {file.uploadedBy?.name}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onPrev}
              disabled={!canPrev}
              style={{ ...ghostBtn, opacity: canPrev ? 1 : 0.38, cursor: canPrev ? 'pointer' : 'default' }}
            >
              ← Prev
            </button>
            <button
              onClick={onNext}
              disabled={!canNext}
              style={{ ...ghostBtn, opacity: canNext ? 1 : 0.38, cursor: canNext ? 'pointer' : 'default' }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FolderBtn ────────────────────────────────────────────────────────────────
function FolderBtn({
  icon, label, count, active, onClick,
}: {
  icon: string; label: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', width: '100%', textAlign: 'left',
        background: active ? 'var(--accent-light)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        transition: 'background var(--transition)',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── FilesPage ────────────────────────────────────────────────────────────────
export default function FilesPage() {
  // Requires Supabase Storage bucket "gradflow-files" to allow authenticated uploads
  // Dashboard → Storage → gradflow-files → Policies → New Policy → Allow insert for authenticated users
  const { files, isLoading: filesLoading, fetchFiles, deleteFile } = useFilesStore();
  const workspaceId = useAuthStore(s => s.currentWorkspace?.id);
  const token       = useAuthStore(s => s.token);
  const [activeFolder,   setActiveFolder]   = useState('All Files');
  const [viewMode,       setViewMode]       = useState<ViewMode>('list');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [previewIndex,   setPreviewIndex]   = useState(-1);
  const [hoveredFileId,  setHoveredFileId]  = useState<string | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [customFolders,  setCustomFolders]  = useState<string[]>([]);
  const [folderError,    setFolderError]    = useState('');
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const folderInputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleUpload = async (file: File) => {
    if (!workspaceId || !token) return;
    setUploading(true);
    try {
      const fileExt  = file.name.split('.').pop();
      const filePath = `${workspaceId}/${Date.now()}_${file.name}`;

      const { data, error } = await getSupabase().storage
        .from('gradflow-files')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (error) throw error;

      const { data: urlData } = getSupabase().storage
        .from('gradflow-files')
        .getPublicUrl(filePath);

      const url    = urlData.publicUrl;

      const type   = fileExt === 'pdf' ? 'pdf' : fileExt === 'docx' ? 'docx' : fileExt === 'pptx' ? 'pptx' : 'pdf';
      const folder = activeFolder && activeFolder !== 'All Files' && activeFolder !== 'recent'
        ? activeFolder
        : (type === 'pptx' ? 'Design' : 'Documents');
      const size   = file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      // Try to save to DB with timeout — show file optimistically if it fails
      try {
        const res = await Promise.race([
          fetch(`/api/workspaces/${workspaceId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: file.name, type, folder, size, url }),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 8000)
          ),
        ]) as Response;
        await res.json();
      } catch (dbErr) {
        useFilesStore.setState(s => ({
          files: [...s.files, {
            id: Date.now().toString(),
            name: file.name,
            type,
            folder,
            size,
            url,
            createdAt: new Date().toISOString(),
            uploadedBy: { id: '', name: 'You', avatarUrl: undefined },
          }],
        }));
      }

      await fetchFiles(workspaceId).catch(() => {});
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err?.message}`);
    } finally {
      setUploading(false);
    }
  };

  const allFolders = ['All Files', ...new Set([...customFolders, ...files.map(f => f.folder)])];

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (allFolders.includes(name)) {
      setFolderError('Folder already exists');
      return;
    }
    setCustomFolders(prev => [...prev, name]);
    setActiveFolder(name);
    setNewFolderName('');
    setShowNewFolder(false);
    setFolderError('');
  };

  const filteredFiles = files.filter(file => {
    const matchesFolder =
      activeFolder === 'All Files' ? true :
      activeFolder === 'recent'    ? (!!file.date && file.date.startsWith('May') && parseInt(file.date.split(' ')[1]) >= 5) :
      file.folder === activeFolder;
    const matchesSearch = !debouncedQuery.trim() ||
      file.name.toLowerCase().includes(debouncedQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const previewFile =
    previewIndex >= 0 && previewIndex < filteredFiles.length
      ? filteredFiles[previewIndex]
      : null;

  const folderLabel = activeFolder === 'recent' ? 'Recent' : activeFolder;

  const openPreview = (file: FileItem) => {
    const idx = filteredFiles.findIndex(f => f.id === file.id);
    if (idx >= 0) setPreviewIndex(idx);
  };

  const handleDelete = async (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    if (!workspaceId) return;
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    setDeletingFileId(file.id);
    await deleteFile(workspaceId, file.id);
    setDeletingFileId(null);
  };

  return (
    <>
      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', borderTop: '1px solid var(--border)' }}>

        {/* ── Left panel — Folders sidebar ─────────────────── */}
        <div style={{
          width: 220, flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 16px 12px',
          }}>
            <span style={{
              fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.8px', fontWeight: 700, color: 'var(--text-muted)',
            }}>
              Folders
            </span>
            {!showNewFolder && (
              <button
                onClick={() => { setShowNewFolder(true); setFolderError(''); setTimeout(() => folderInputRef.current?.focus(), 0); }}
                style={{
                  fontSize: 11, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, fontFamily: 'var(--font-body)',
                }}
              >
                + New Folder
              </button>
            )}
          </div>

          {/* Inline new-folder prompt */}
          {showNewFolder && (
            <div style={{ padding: '0 10px 10px' }}>
              <input
                ref={folderInputRef}
                value={newFolderName}
                onChange={e => { setNewFolderName(e.target.value); setFolderError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); setFolderError(''); } }}
                placeholder="Folder name…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg)', border: `1px solid ${folderError ? 'var(--red)' : 'var(--accent)'}`,
                  borderRadius: 'var(--radius-sm)', padding: '6px 10px',
                  fontSize: 12, color: 'var(--text-primary)', outline: 'none',
                  fontFamily: 'var(--font-body)', marginBottom: 6,
                }}
              />
              {folderError && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6 }}>
                  {folderError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleCreateFolder}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                    background: 'var(--accent)', color: 'white', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); setFolderError(''); }}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Main folders */}
          {allFolders.map(name => (
            <FolderBtn
              key={name}
              icon="📁"
              label={name}
              count={name === 'All Files' ? files.length : files.filter(f => f.folder === name).length}
              active={activeFolder === name}
              onClick={() => { setActiveFolder(name); setShowNewFolder(false); }}
            />
          ))}

          {/* Divider + Recent */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          <div style={{
            padding: '2px 16px 6px',
            fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '0.6px', fontWeight: 700, color: 'var(--text-muted)',
          }}>
            Recent
          </div>
          <FolderBtn
            icon="🕐"
            label="This Week"
            active={activeFolder === 'recent'}
            onClick={() => setActiveFolder('recent')}
          />
        </div>

        {/* ── Right panel ──────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {folderLabel}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
                {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search */}
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files…"
                style={{
                  width: 180,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 12px', fontSize: 13,
                  color: 'var(--text-primary)', outline: 'none',
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color var(--transition)',
                }}
                onFocus={e  => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e   => { e.target.style.borderColor = 'var(--border)'; }}
              />

              {/* View toggle: Grid ⊞ / List ☰ */}
              <div style={{
                display: 'flex', gap: 2, padding: 2,
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
              }}>
                {([['grid', '⊞'], ['list', '☰']] as const).map(([mode, icon]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={mode === 'grid' ? 'Grid' : 'List'}
                    style={{
                      width: 32, height: 28, borderRadius: 6, border: 'none',
                      cursor: 'pointer', fontSize: 14,
                      background: viewMode === mode ? 'var(--surface)' : 'transparent',
                      color:      viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow:  viewMode === mode ? 'var(--shadow-sm)' : 'none',
                      transition: 'var(--transition)',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* Upload */}
              <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  disabled={uploading}
                />
                <span style={{
                  display: 'inline-block', whiteSpace: 'nowrap',
                  background: uploading ? 'var(--accent-light)' : 'var(--accent)',
                  color: uploading ? 'var(--accent)' : 'white',
                  borderRadius: 'var(--radius-sm)', padding: '7px 14px',
                  fontSize: 13, fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'opacity var(--transition)',
                  userSelect: 'none',
                }}>
                  {uploading ? 'Uploading…' : '↑ Upload'}
                </span>
              </label>
            </div>
          </div>

          {/* List table header */}
          {viewMode === 'list' && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 80px 140px',
              padding: '8px 24px', flexShrink: 0,
              background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            }}>
              {['Name', 'Folder', 'Size', 'Actions'].map(col => (
                <span key={col} style={{
                  fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: '0.7px', color: 'var(--text-muted)', fontWeight: 700,
                }}>
                  {col}
                </span>
              ))}
            </div>
          )}

          {/* Scrollable file area */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>

            {/* ─── Loading skeleton ───────────────────────────── */}
            {filesLoading && (
              <div style={{ padding: '16px 24px' }}>
                <SkeletonLoader rows={5} height={48} />
              </div>
            )}

            {/* ─── List view ─────────────────────────────────── */}
            {!filesLoading && viewMode === 'list' && filteredFiles.map(file => {
              const icon    = FILE_ICON[file.type] ?? { bg: '#F3F4F6', emoji: '📎' };
              const hovered = hoveredFileId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => openPreview(file)}
                  onMouseEnter={() => setHoveredFileId(file.id)}
                  onMouseLeave={() => setHoveredFileId(null)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 80px 140px',
                    alignItems: 'center', padding: '11px 24px',
                    borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: hovered ? 'var(--bg)' : 'var(--surface)',
                    transition: 'background var(--transition)',
                  }}
                >
                  {/* Name + uploader */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: icon.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>
                      {icon.emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        Uploaded by {file.uploadedBy?.name}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{file.folder}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{file.size}</span>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={e => { e.stopPropagation(); openPreview(file); }}
                      style={{
                        fontSize: 12, color: 'var(--text-secondary)',
                        border: '1px solid var(--border)', padding: '4px 8px',
                        borderRadius: 6, background: 'var(--surface)', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                      }}
                    >
                      👁 Preview
                    </button>
                    <button
                      onClick={e => handleDelete(e, file)}
                      disabled={deletingFileId === file.id}
                      style={{
                        fontSize: 12, padding: '4px 8px', lineHeight: 1,
                        border: '1px solid var(--red-light)', borderRadius: 6,
                        background: 'var(--surface)', cursor: deletingFileId === file.id ? 'not-allowed' : 'pointer',
                        color: 'var(--red)', opacity: deletingFileId === file.id ? 0.4 : 1,
                        transition: 'background var(--transition)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ─── Grid view ─────────────────────────────────── */}
            {!filesLoading && viewMode === 'grid' && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 14, padding: 24,
              }}>
                {filteredFiles.map(file => {
                  const icon = FILE_ICON[file.type] ?? { bg: '#F3F4F6', emoji: '📎' };
                  const uploaderInitials = (file.uploadedBy?.name ?? '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={file.id}
                      onClick={() => openPreview(file)}
                      style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', padding: 16,
                        cursor: 'pointer', position: 'relative',
                        transition: 'box-shadow var(--transition), transform var(--transition)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        const btn = e.currentTarget.querySelector<HTMLButtonElement>('.grid-delete-btn');
                        if (btn) btn.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = '';
                        e.currentTarget.style.transform = '';
                        const btn = e.currentTarget.querySelector<HTMLButtonElement>('.grid-delete-btn');
                        if (btn) btn.style.opacity = '0';
                      }}
                    >
                      <button
                        className="grid-delete-btn"
                        onClick={e => handleDelete(e, file)}
                        disabled={deletingFileId === file.id}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(255,255,255,0.9)', borderRadius: 6,
                          padding: '4px 6px', fontSize: 14, cursor: 'pointer',
                          border: '1px solid var(--border)', lineHeight: 1,
                          opacity: 0, transition: 'opacity var(--transition), color var(--transition)',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        🗑
                      </button>
                      {/* Icon */}
                      <div style={{
                        width: 48, height: 48, borderRadius: 10,
                        background: icon.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24,
                      }}>
                        {icon.emoji}
                      </div>

                      {/* Name — 2-line cap via max-height */}
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                        marginTop: 10, marginBottom: 0, lineHeight: 1.35,
                        maxHeight: '2.7em', overflow: 'hidden',
                      }}>
                        {file.name}
                      </p>

                      {/* Size + date */}
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                        {file.size} · {file.date}
                      </p>

                      {/* Bottom: avatar + download */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginTop: 10,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: '#888',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: 'white',
                        }}>
                          {uploaderInitials}
                        </div>
                        <button
                          onClick={e => e.stopPropagation()}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 15, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1,
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!filesLoading && filteredFiles.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '80px 24px',
                fontSize: 13, color: 'var(--text-muted)',
              }}>
                No files found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ─────────────────────────────────────── */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          total={filteredFiles.length}
          index={previewIndex}
          onClose={() => setPreviewIndex(-1)}
          onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
          onNext={() => setPreviewIndex(i => Math.min(filteredFiles.length - 1, i + 1))}
        />
      )}
    </>
  );
}
