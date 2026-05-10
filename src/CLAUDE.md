# GradFlow — Frontend Agent

Read /CLAUDE.md first for full project context.

## Your Responsibility
Build and maintain all UI: pages, components, layouts, interactions.

## Component Conventions

### Page component template
```tsx
'use client'
// imports
export default function XxxPage() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 80px' }}>
      {/* content */}
    </div>
  )
}
```

### Card component pattern
```tsx
<div style={{
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
  boxShadow: 'var(--shadow-sm)'
}}>
```

### Avatar pattern (initials circle)
```tsx
<div style={{
  width: 28, height: 28, borderRadius: '50%',
  background: member.color,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 700, color: 'white'
}}>
  {member.initials}
</div>
```

### Priority tag pattern
```tsx
// high → red-light/red | medium → amber-light/amber | low → border/text-secondary
<span style={{
  background: 'var(--red-light)', color: 'var(--red)',
  fontSize: 11, fontWeight: 600,
  padding: '2px 8px', borderRadius: 20
}}>High</span>
```

## Interaction Patterns
- Hover effects: always use transition var(--transition)
- Cards: hover lifts with shadow-md
- Buttons: hover changes bg, never jarring
- Modals/panels: backdrop blur(6px), overlay rgba(0,0,0,0.4)
- Toasts: bottom-right, slide up, auto-dismiss 3.5s
- Expanded states: max-height transition for smooth accordion

## What NOT to do
- No external UI libraries (no shadcn, no MUI, no Radix)
- No hardcoded hex colors
- No px font sizes above 28px except page titles
- No unnecessary wrappers or divs
- Don't re-create Toast.tsx or TopNav.tsx — import them

## Page wiring (page.tsx pattern)
```tsx
{activePage === 'xxx' && <XxxPage onNavigate={setActivePage} />}
```
Pass onNavigate only if the page needs to link to another page.
