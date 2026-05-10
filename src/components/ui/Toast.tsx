'use client';

export default function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: 'var(--text-primary)',
        color: 'white',
        padding: '12px 18px',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: 13,
        fontWeight: 500,
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 32px))',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
        maxWidth: 320,
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  );
}
