'use client';

import { useState } from 'react';
import { useImportantStore, type PinnedItem } from '@/store/importantStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = 'all' | PinnedItem['category'];

// ─── Style maps ───────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<PinnedItem['type'], { border: string; bg: string; color: string }> = {
  red:   { border: 'var(--red)',   bg: 'var(--red-light)',   color: 'var(--red)'   },
  blue:  { border: 'var(--blue)',  bg: 'var(--blue-light)',  color: 'var(--blue)'  },
  green: { border: 'var(--green)', bg: 'var(--green-light)', color: 'var(--green)' },
  amber: { border: 'var(--amber)', bg: 'var(--amber-light)', color: 'var(--amber)' },
};

const BY_MAP: Record<string, { initials: string; color: string }> = {
  'Sara Ahmed':  { initials: 'SA', color: '#D4500A' },
  'Omar Khalil': { initials: 'OK', color: '#2563EB' },
  'Lina Hassan': { initials: 'LH', color: '#16A34A' },
  'Ahmed Nour':  { initials: 'AN', color: '#7C3AED' },
  'Nora Salem':  { initials: 'NS', color: '#D97706' },
  'Dr. Khalid':  { initials: 'DK', color: '#374151' },
};

function getMember(by: string) {
  return BY_MAP[by] ?? {
    initials: by.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
    color:    '#888',
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',          label: 'All'          },
  { id: 'Instructions', label: 'Instructions' },
  { id: 'Critical',     label: 'Critical'     },
  { id: 'Decision',     label: 'Decisions'    },
  { id: 'Resources',    label: 'Resources'    },
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
  if (item.category === 'Resources') {
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
  item, expanded, onToggle, onTogglePin,
}: {
  item:        PinnedItem;
  expanded:    boolean;
  onToggle:    () => void;
  onTogglePin: () => void;
}) {
  const style  = TYPE_STYLE[item.type];
  const member = getMember(item.by);

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
            {item.category}
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
            whiteSpace: item.category === 'Resources' ? 'normal' : 'pre-line',
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
            background: member.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white',
          }}>
            {member.initials}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Added by {item.by}</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={e => e.stopPropagation()}
            style={GHOST_BTN}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(); }}
            style={GHOST_BTN}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {item.pinned ? 'Unpin' : 'Pin'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ImportantPage ────────────────────────────────────────────────────────────
export default function ImportantPage() {
  const { items, togglePin } = useImportantStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
          style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'var(--transition)', flexShrink: 0,
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
              transition:  'var(--transition)',
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
        {visibleItems.map(item => (
          <ImportantCard
            key={item.id}
            item={item}
            expanded={expandedIds.has(item.id)}
            onToggle={() => toggleExpand(item.id)}
            onTogglePin={() => togglePin(item.id)}
          />
        ))}

        {visibleItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            No items in this category.
          </div>
        )}
      </div>

    </div>
  );
}
