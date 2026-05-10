'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'timeline' | 'calendar';

interface GanttSubtask {
  id:         string;
  label:      string;
  start:      string;
  end:        string;
  done:       boolean;
  dependsOn?: string;
}

interface GanttParentTask {
  id:       string;
  label:    string;
  color:    string;
  subtasks: GanttSubtask[];
}

interface CalendarEvent {
  year:     number;
  month:    number;
  day:      number;
  label:    string;
  colorKey: string;
}

// ─── Gantt Data ───────────────────────────────────────────────────────────────
const PARENT_TASKS: GanttParentTask[] = [
  { id: 'p1', label: 'Project Setup', color: '#16A34A', subtasks: [
    { id: 's1', label: 'Kickoff Meeting',          start: 'Apr 14', end: 'Apr 15', done: true  },
    { id: 's2', label: 'Assign Roles',             start: 'Apr 15', end: 'Apr 16', done: true,  dependsOn: 's1' },
  ]},
  { id: 'p2', label: 'Proposal', color: '#2563EB', subtasks: [
    { id: 's3', label: 'Write Problem Statement',  start: 'Apr 16', end: 'Apr 20', done: true  },
    { id: 's4', label: 'Define Objectives',        start: 'Apr 20', end: 'Apr 23', done: true,  dependsOn: 's3' },
    { id: 's5', label: 'Supervisor Approval',      start: 'Apr 24', end: 'Apr 28', done: true,  dependsOn: 's4' },
  ]},
  { id: 'p3', label: 'UI/UX Design', color: '#7C3AED', subtasks: [
    { id: 's6', label: 'Low-fi Wireframes',        start: 'Apr 28', end: 'May 3',  done: true  },
    { id: 's7', label: 'Figma Prototype',          start: 'May 3',  end: 'May 8',  done: true,  dependsOn: 's6' },
    { id: 's8', label: 'UI Review & Feedback',     start: 'May 8',  end: 'May 10', done: false, dependsOn: 's7' },
  ]},
  { id: 'p4', label: 'Development', color: '#D4500A', subtasks: [
    { id: 's9',  label: 'DB Schema Design',        start: 'May 5',  end: 'May 11', done: false },
    { id: 's10', label: 'Auth System',             start: 'May 11', end: 'May 16', done: false, dependsOn: 's9'  },
    { id: 's11', label: 'Dashboard UI',            start: 'May 10', end: 'May 17', done: false },
    { id: 's12', label: 'API Integration',         start: 'May 17', end: 'May 25', done: false, dependsOn: 's10' },
  ]},
  { id: 'p5', label: 'Research & Docs', color: '#D97706', subtasks: [
    { id: 's13', label: 'Literature Review',       start: 'Apr 20', end: 'May 12', done: false },
    { id: 's14', label: 'Chapter 2 Draft',         start: 'May 12', end: 'May 20', done: false, dependsOn: 's13' },
    { id: 's15', label: 'Chapter 3 Draft',         start: 'May 20', end: 'Jun 1',  done: false, dependsOn: 's14' },
  ]},
  { id: 'p6', label: 'Testing & QA', color: '#0891B2', subtasks: [
    { id: 's16', label: 'Unit Testing',            start: 'May 25', end: 'Jun 5',  done: false },
    { id: 's17', label: 'Integration Testing',     start: 'Jun 5',  end: 'Jun 10', done: false, dependsOn: 's16' },
    { id: 's18', label: 'Bug Fixes',               start: 'Jun 10', end: 'Jun 15', done: false, dependsOn: 's17' },
  ]},
  { id: 'p7', label: 'Submission', color: '#DC2626', subtasks: [
    { id: 's19', label: 'Final Documentation',     start: 'Jun 8',  end: 'Jun 18', done: false },
    { id: 's20', label: 'Live Deployment',         start: 'Jun 15', end: 'Jun 18', done: false, dependsOn: 's19' },
    { id: 's21', label: 'Final Presentation',      start: 'Jun 25', end: 'Jun 28', done: false, dependsOn: 's20' },
  ]},
];

// ─── Calendar Data ────────────────────────────────────────────────────────────
const CAL_EVENTS: CalendarEvent[] = [
  { year: 2025, month: 4, day: 10, label: 'UI Prototype', colorKey: 'accent' },
  { year: 2025, month: 4, day: 25, label: 'Mid Report',   colorKey: 'amber'  },
  { year: 2025, month: 5, day:  8, label: 'Dev Complete', colorKey: 'blue'   },
  { year: 2025, month: 5, day: 18, label: 'Go Live',      colorKey: 'green'  },
  { year: 2025, month: 5, day: 28, label: 'Presentation', colorKey: 'purple' },
];

const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  accent: { bg: 'var(--accent-light)',  color: 'var(--accent)'  },
  amber:  { bg: 'var(--amber-light)',   color: 'var(--amber)'   },
  blue:   { bg: 'var(--blue-light)',    color: 'var(--blue)'    },
  green:  { bg: 'var(--green-light)',   color: 'var(--green)'   },
  purple: { bg: 'var(--purple-light)',  color: 'var(--purple)'  },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── Calendar Helpers ─────────────────────────────────────────────────────────
function getCalendarDays(year: number, month: number) {
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const prevDays       = new Date(year, month, 0).getDate();

  const prevMonth = month === 0  ? 11 : month - 1;
  const prevYear  = month === 0  ? year - 1 : year;
  const nextMonth = month === 11 ? 0  : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;

  type Cell = { day: number; month: number; year: number; isCurrentMonth: boolean };
  const cells: Cell[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, month: prevMonth, year: prevYear, isCurrentMonth: false });

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month, year, isCurrentMonth: true });

  for (let d = 1; cells.length < 42; d++)
    cells.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });

  return cells;
}

// ─── Gantt Helpers ────────────────────────────────────────────────────────────
const DAY_WIDTH   = 14
const CHART_START = new Date('2025-04-14')
const CHART_END   = new Date('2025-06-30')
const GANTT_TODAY = new Date('2025-05-09')

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function parseDate(str: string): Date {
  const [month, day] = str.split(' ')
  const months: Record<string, number> = { Apr: 3, May: 4, Jun: 5 }
  return new Date(2025, months[month], parseInt(day))
}

const TOTAL_DAYS  = daysBetween(CHART_START, CHART_END)
const CHART_WIDTH = TOTAL_DAYS * DAY_WIDTH

// Month blocks: [label, startOffset, widthInDays]
const MONTH_BLOCKS: [string, number, number][] = [
  ['April 2025', 0,                                    daysBetween(CHART_START, new Date('2025-05-01'))],
  ['May 2025',   daysBetween(CHART_START, new Date('2025-05-01')), 31],
  ['June 2025',  daysBetween(CHART_START, new Date('2025-06-01')), 30],
]

// Week tick labels every 7 days
const WEEK_TICKS: { label: string; offset: number }[] = []
const TICK_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
for (let i = 0; i * 7 < TOTAL_DAYS; i++) {
  const d = new Date(CHART_START)
  d.setDate(d.getDate() + i * 7)
  WEEK_TICKS.push({
    label:  `${TICK_MONTHS[d.getMonth()]} ${d.getDate()}`,
    offset: i * 7 * DAY_WIDTH,
  })
}

// ─── TimelinePage ─────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [view,      setView]      = useState<ViewMode>('timeline');
  const [calYear,   setCalYear]   = useState(2025);
  const [calMonth,  setCalMonth]  = useState(5);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const today   = new Date();
  const calDays = getCalendarDays(calYear, calMonth);

  function goPrev() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function goNext() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }
  function getEvents(year: number, month: number, day: number) {
    return CAL_EVENTS.filter(e => e.year === year && e.month === month && e.day === day);
  }
  function isToday(year: number, month: number, day: number) {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  }

  const prevLabel = `${MONTH_NAMES[calMonth === 0 ? 11 : calMonth - 1]} ${calMonth === 0 ? calYear - 1 : calYear}`;
  const nextLabel = `${MONTH_NAMES[calMonth === 11 ? 0 : calMonth + 1]} ${calMonth === 11 ? calYear + 1 : calYear}`;

  // ── View toggle ────────────────────────────────────────────────────────────
  const viewToggle = (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
      {(['timeline', 'calendar'] as const).map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            padding:    '7px 16px',
            fontSize:   12,
            fontWeight: 600,
            border:     'none',
            cursor:     'pointer',
            transition: 'var(--transition)',
            background: view === v ? 'var(--text-primary)' : 'var(--surface)',
            color:      view === v ? 'white'               : 'var(--text-secondary)',
          }}
        >
          {v === 'timeline' ? 'Timeline' : 'Calendar'}
        </button>
      ))}
    </div>
  );

  // ── Gantt view ─────────────────────────────────────────────────────────────
  if (view === 'timeline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* Page header */}
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          padding:        '20px 24px',
          borderBottom:   '1px solid var(--border)',
          flexShrink:     0,
          background:     'var(--surface)',
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
              Timeline
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Project milestones &amp; key dates
            </p>
          </div>
          {viewToggle}
        </div>

        {/* Two-panel area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left panel — JS-synced vertical scroll, never scrolls horizontally */}
          <div
            id="gantt-left"
            style={{
              width:       240,
              flexShrink:  0,
              borderRight: '1px solid var(--border)',
              overflowY:   'hidden',
              background:  'var(--surface)',
              zIndex:      10,
            }}
          >
            {/* Panel header */}
            <div style={{
              height:       52,
              borderBottom: '1px solid var(--border)',
              padding:      '0 16px',
              display:      'flex',
              alignItems:   'center',
              background:   'var(--surface)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Gantt Chart</span>
            </div>

            {/* Task rows */}
            {PARENT_TASKS.map(parent => (
              <div key={parent.id}>
                {/* Parent row */}
                <div style={{
                  height:     36,
                  padding:    '0 16px',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                  background: parent.color + '12',
                }}>
                  <div style={{
                    width:        8,
                    height:       8,
                    borderRadius: '50%',
                    background:   parent.color,
                    flexShrink:   0,
                  }} />
                  <span style={{
                    fontSize:      12,
                    fontWeight:    700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    color:         'var(--text-primary)',
                    whiteSpace:    'nowrap',
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                  }}>
                    {parent.label}
                  </span>
                </div>

                {/* Subtask rows */}
                {parent.subtasks.map(sub => (
                  <div key={sub.id} style={{
                    height:       32,
                    padding:      '0 16px 0 32px',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>–</span>
                    <span style={{
                      fontSize:     12,
                      color:        'var(--text-secondary)',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {sub.label}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right panel — owns both scroll axes, syncs left panel vertically */}
          <div
            id="gantt-right"
            style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', background: 'var(--bg)' }}
            onScroll={e => {
              const left = document.getElementById('gantt-left')
              if (left) left.scrollTop = e.currentTarget.scrollTop
            }}
          >
            <div style={{ position: 'relative', minWidth: CHART_WIDTH }}>

              {/* ── Sticky date header ── */}
              <div style={{
                height:       52,
                position:     'sticky',
                top:          0,
                zIndex:       5,
                background:   'var(--surface)',
                borderBottom: '1px solid var(--border)',
                width:        CHART_WIDTH,
              }}>
                {/* Row 1 — Month labels */}
                <div style={{ height: 26, position: 'relative' }}>
                  {MONTH_BLOCKS.map(([label, startDays, widthDays]) => (
                    <div
                      key={label}
                      style={{
                        position:      'absolute',
                        left:          startDays * DAY_WIDTH,
                        width:         widthDays * DAY_WIDTH,
                        height:        '100%',
                        borderRight:   '1px solid var(--border)',
                        padding:       '0 10px',
                        display:       'flex',
                        alignItems:    'center',
                        fontSize:      11,
                        fontWeight:    700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color:         'var(--text-secondary)',
                        boxSizing:     'border-box',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Row 2 — Week markers */}
                <div style={{ height: 26, position: 'relative', borderTop: '1px solid var(--border)' }}>
                  {WEEK_TICKS.map(tick => (
                    <div
                      key={tick.offset}
                      style={{
                        position:    'absolute',
                        left:        tick.offset,
                        height:      '100%',
                        borderRight: '1px dashed var(--border)',
                        opacity:     0.5,
                        paddingLeft: 4,
                        display:     'flex',
                        alignItems:  'center',
                        fontSize:    10,
                        color:       'var(--text-muted)',
                        whiteSpace:  'nowrap',
                      }}
                    >
                      {tick.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Today line ── */}
              <div style={{
                position:      'absolute',
                top:           0,
                bottom:        0,
                left:          daysBetween(CHART_START, GANTT_TODAY) * DAY_WIDTH,
                width:         2,
                background:    'var(--accent)',
                opacity:       0.7,
                zIndex:        4,
                pointerEvents: 'none',
              }}>
                <div style={{
                  position:     'absolute',
                  top:          0,
                  left:         -16,
                  width:        34,
                  background:   'var(--accent)',
                  color:        'white',
                  fontSize:     9,
                  fontWeight:   700,
                  textAlign:    'center',
                  padding:      '2px 0',
                  borderRadius: 3,
                }}>
                  TODAY
                </div>
              </div>

              {/* ── Row backgrounds + bars ── */}
              {PARENT_TASKS.map(parent => (
                <div key={parent.id}>
                  {/* Parent row bg — no bar */}
                  <div style={{
                    height:       36,
                    width:        '100%',
                    background:   parent.color + '08',
                    borderBottom: '1px solid var(--border)',
                  }} />

                  {/* Subtask rows */}
                  {parent.subtasks.map(sub => {
                    const barLeft  = daysBetween(CHART_START, parseDate(sub.start)) * DAY_WIDTH
                    const barWidth = Math.max(24, daysBetween(parseDate(sub.start), parseDate(sub.end)) * DAY_WIDTH)
                    const hovered  = hoveredId === sub.id

                    return (
                      <div key={sub.id} style={{
                        height:       32,
                        width:        '100%',
                        background:   'transparent',
                        borderBottom: '1px solid var(--border)',
                        position:     'relative',
                      }}>
                        {/* Bar */}
                        <div
                          onMouseEnter={() => setHoveredId(sub.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          style={{
                            position:     'absolute',
                            top:          8,
                            left:         barLeft,
                            width:        barWidth,
                            height:       16,
                            borderRadius: 100,
                            background:   parent.color,
                            opacity:      hovered ? 1 : sub.done ? 1 : 0.82,
                            boxShadow:    hovered ? `0 2px 10px ${parent.color}60` : 'none',
                            transition:   'opacity 0.15s ease, box-shadow 0.15s ease',
                            cursor:       'pointer',
                            overflow:     'hidden',
                          }}
                        >
                          {/* Stripe overlay for done bars */}
                          {sub.done && (
                            <div style={{
                              position:     'absolute',
                              inset:        0,
                              borderRadius: 'inherit',
                              background:   'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 6px)',
                            }} />
                          )}

                          {/* Bar label — inside bar, only when wide enough */}
                          {barWidth > 55 && (
                            <div style={{
                              position:   'absolute',
                              left:       0,
                              top:        0,
                              bottom:     0,
                              display:    'flex',
                              alignItems: 'center',
                              fontSize:   10,
                              fontWeight: 600,
                              color:      'white',
                              whiteSpace: 'nowrap',
                              overflow:   'hidden',
                              padding:    '0 8px',
                              zIndex:     1,
                            }}>
                              {sub.done ? '✓ ' : ''}{sub.label}
                            </div>
                          )}
                        </div>

                        {/* Tooltip */}
                        {hovered && (
                          <div style={{
                            position:      'absolute',
                            bottom:        'calc(100% + 6px)',
                            left:          barLeft,
                            background:    '#1C1917',
                            color:         'white',
                            fontSize:      11,
                            fontWeight:    500,
                            padding:       '6px 12px',
                            borderRadius:  6,
                            whiteSpace:    'nowrap',
                            zIndex:        10,
                            pointerEvents: 'none',
                            boxShadow:     'var(--shadow-md)',
                          }}>
                            {sub.label}  ·  {sub.start} → {sub.end}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* ── Dependency arrows ── */}
              {(() => {
                // Build subtask geometry map
                type BarInfo = { barLeft: number; barRight: number; centerY: number }
                const barMap: Record<string, BarInfo> = {}
                let y = 0
                for (const parent of PARENT_TASKS) {
                  y += 36 // parent row
                  for (const sub of parent.subtasks) {
                    const bl = daysBetween(CHART_START, parseDate(sub.start)) * DAY_WIDTH
                    const br = daysBetween(CHART_START, parseDate(sub.end))   * DAY_WIDTH
                    barMap[sub.id] = { barLeft: bl, barRight: br, centerY: y + 8 + 8 }
                    y += 32 // subtask row
                  }
                }

                const paths: React.ReactElement[] = []
                for (const parent of PARENT_TASKS) {
                  for (const sub of parent.subtasks) {
                    if (!sub.dependsOn) continue
                    const source = barMap[sub.dependsOn]
                    const target = barMap[sub.id]
                    if (!source || !target) continue
                    const sx = source.barRight
                    const sy = source.centerY
                    const tx = target.barLeft
                    const ty = target.centerY
                    if (tx <= sx) continue
                    const bend = Math.min(40, (tx - sx) / 2)
                    const cx1  = sx + bend
                    const cx2  = tx - bend
                    paths.push(
                      <path
                        key={sub.id + '_dep'}
                        d={`M ${sx} ${sy} C ${cx1} ${sy} ${cx2} ${ty} ${tx} ${ty}`}
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                      />
                    )
                  }
                }

                return (
                  <svg
                    style={{
                      position:      'absolute',
                      top:           52,
                      left:          0,
                      width:         CHART_WIDTH,
                      height:        '100%',
                      pointerEvents: 'none',
                      zIndex:        3,
                      overflow:      'visible',
                    }}
                  >
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L0,6 L6,3 z" fill="rgba(0,0,0,0.2)" />
                      </marker>
                    </defs>
                    {paths}
                  </svg>
                )
              })()}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Calendar view ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            Timeline
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Project milestones &amp; key dates
          </p>
        </div>
        {viewToggle}
      </div>

      {/* Month switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={goPrev}
          style={{ border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';        e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          ← {prevLabel}
        </button>

        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </span>

        <button
          onClick={goNext}
          style={{ border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';        e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {nextLabel} →
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          {DAY_HEADERS.map(d => (
            <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calDays.map((cell, idx) => {
            const todayCell = isToday(cell.year, cell.month, cell.day);
            const events    = getEvents(cell.year, cell.month, cell.day);
            const col       = idx % 7;
            const row       = Math.floor(idx / 7);

            return (
              <div
                key={idx}
                style={{
                  minHeight:    88,
                  borderRight:  col < 6 ? '1px solid var(--border)' : 'none',
                  borderBottom: row < 5 ? '1px solid var(--border)' : 'none',
                  padding:      8,
                  background:   !cell.isCurrentMonth ? 'var(--bg)' : todayCell ? 'var(--accent-light)' : 'var(--surface)',
                  opacity:      cell.isCurrentMonth ? 1 : 0.5,
                }}
              >
                {todayCell ? (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{cell.day}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{cell.day}</span>
                )}

                {events.slice(0, 2).map((ev, ei) => {
                  const c = EVENT_COLORS[ev.colorKey] ?? EVENT_COLORS.accent;
                  return (
                    <div
                      key={ei}
                      style={{
                        marginTop:    3,
                        borderRadius: 4,
                        padding:      '2px 7px',
                        fontSize:     11,
                        fontWeight:   600,
                        background:   c.bg,
                        color:        c.color,
                        overflow:     'hidden',
                        whiteSpace:   'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {ev.label}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
