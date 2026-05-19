'use client';

import { useState, useEffect } from 'react';
import { useImportantStore, type PinnedItem } from '@/store/importantStore';
import { useAuthStore } from '@/store/authStore';

type FilterTab = 'all' | PinnedItem['category'];

// ─── Style maps ───────────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<string, { border: string; bg: string; color: string; label: string }> = {
  INSTRUCTIONS: { border: 'var(--accent)',  bg: 'var(--accent-light)',  color: 'var(--accent)',  label: 'Instructions'  },
  CRITICAL:     { border: 'var(--red)',     bg: 'var(--red-light)',     color: 'var(--red)',     label: 'Critical'      },
  DECISION:     { border: 'var(--green)',   bg: 'var(--green-light)',   color: 'var(--green)',   label: 'Decision'      },
  RESOURCES:    { border: 'var(--amber)',   bg: 'var(--amber-light)',   color: 'var(--amber)',   label: 'Resources'     },
  ANNOUNCEMENT: { border: 'var(--blue)',    bg: 'var(--blue-light)',    color: 'var(--blue)',    label: 'Announcement'  },
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',          label: 'All'           },
  { id: 'INSTRUCTIONS', label: 'Instructions'  },
  { id: 'CRITICAL',     label: 'Critical'      },
  { id: 'DECISION',     label: 'Decisions'     },
  { id: 'RESOURCES',    label: 'Resources'     },
  { id: 'ANNOUNCEMENT', label: 'Announcements' },
];

const GHOST_BTN: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)',
  border: '1px solid var(--border)', padding: '4px 10px',
  borderRadius: 6, background: 'transparent',
  cursor: 'pointer', transition: 'var(--transition)',
  fontFamily: 'var(--font-body)',
};

// ─── BodyContent ──────────────────────────────────────────────────────────────
function BodyContent({ item }: { item: PinnedItem }) {
  if (item.category === 'RESOURCES') {
    const parts = item.body.split(' · ');
    return (
      <>
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: 'var(--text-muted)' }}> · </span>}
            <span style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 500 }}>
              {part}
            </span>
          </span>
        ))}
      </>
    );
  }
  return <>{item.body}</>;
}

// ─── ImportantCard ────────────────────────────────────────────────────────────
function ImportantCard({
  item, expanded, onToggle, onTogglePin, onDelete,
}: {
  item:        PinnedItem;
  expanded:    boolean;
  onToggle:    () => void;
  onTogglePin: () => void;
  onDelete:    () => void;
}) {
  const style    = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.INSTRUCTIONS;
  const initials = (item.addedBy?.name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onToggle}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderLeft:   `4px solid ${style.border}`,
        borderRadius: 'var(--radius-md)',
        padding:      '20px 24px',
        boxShadow:    'var(--shadow-sm)',
        cursor:       'pointer',
        transition:   'box-shadow var(--transition)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{
            background: style.bg, color: style.color,
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 10px', borderRadius: 20,
          }}>
            {style.label}
          </span>
          <h3 style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            marginTop: 6, marginBottom: 0, lineHeight: 1.35,
          }}>
            {item.title}
          </h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.date}</div>
          {item.pinned && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>📌 Pinned</div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ marginTop: 12 }}>
        <div style={{ maxHeight: expanded ? 600 : 72, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
          <p style={{
            fontSize: 13.5, color: 'var(--text-secondary)',
            lineHeight: 1.7, margin: 0,
            whiteSpace: item.category === 'RESOURCES' ? 'normal' : 'pre-line',
          }}>
            <BodyContent item={item} />
          </p>
        </div>
        <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
          {expanded ? 'Show less ↑' : 'Show more ↓'}
        </span>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: style.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white',
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Added by {item.addedBy?.name}</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(); }}
            style={GHOST_BTN}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {item.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ ...GHOST_BTN, color: 'var(--red)', borderColor: 'var(--red-light)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddNoteModal ─────────────────────────────────────────────────────────────
function AddNoteModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { title: string; body: string; category: string }) => Promise<void>;
}) {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [category, setCategory] = useState('INSTRUCTIONS');
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await onAdd({ title: title.trim(), body: body.trim(), category });
    setSaving(false);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color var(--transition)',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(540px, 90vw)',
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', padding: 28,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0, color: 'var(--text-primary)' }}>
            Add Note
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: '2px 6px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Note title…"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)';  }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category *</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={inputStyle}
          >
            <option value="INSTRUCTIONS">Instructions</option>
            <option value="CRITICAL">Critical</option>
            <option value="DECISION">Decision</option>
            <option value="RESOURCES">Resources</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Content *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your note here…"
            rows={5}
            style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)';  }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', fontSize: 13, cursor: 'pointer',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !body.trim()}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              cursor: saving || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
              border: 'none', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', color: 'white',
              opacity: saving || !title.trim() || !body.trim() ? 0.5 : 1,
              fontFamily: 'var(--font-body)', transition: 'opacity var(--transition)',
            }}
          >
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ImportantPage ────────────────────────────────────────────────────────────
export default function ImportantPage() {
  const workspaceId = useAuthStore(s => s.currentWorkspace?.id);
  const { items, isLoading, fetchItems, addItem, deleteItem, togglePin } = useImportantStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set());
  const [showModal,    setShowModal]    = useState(false);

  useEffect(() => {
    if (workspaceId) fetchItems(workspaceId);
  }, [workspaceId]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDelete = async (itemId: string) => {
    if (!workspaceId) return;
    if (!window.confirm('Delete this note?')) return;
    await deleteItem(workspaceId, itemId);
  };

  const handleTogglePin = async (item: PinnedItem) => {
    if (!workspaceId) return;
    await togglePin(workspaceId, item.id, !item.pinned);
  };

  const visibleItems = activeFilter === 'all'
    ? items
    : items.filter(item => item.category === activeFilter);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            Important
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Pinned notes, supervisor instructions &amp; key decisions
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity var(--transition)', flexShrink: 0,
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1';    }}
        >
          + Add Note
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              padding: '6px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 600, border: '1px solid', cursor: 'pointer',
              transition: 'var(--transition)',
              background:  activeFilter === tab.id ? 'var(--text-primary)' : 'var(--bg)',
              color:       activeFilter === tab.id ? 'white'               : 'var(--text-secondary)',
              borderColor: activeFilter === tab.id ? 'var(--text-primary)' : 'var(--border)',
              fontFamily:  'var(--font-body)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : visibleItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            No items in this category.
          </div>
        ) : (
          visibleItems.map(item => (
            <ImportantCard
              key={item.id}
              item={item}
              expanded={expandedIds.has(item.id)}
              onToggle={() => toggleExpand(item.id)}
              onTogglePin={() => handleTogglePin(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}
      </div>

      {showModal && workspaceId && (
        <AddNoteModal
          onClose={() => setShowModal(false)}
          onAdd={data => addItem(workspaceId, data)}
        />
      )}
    </div>
  );
}
