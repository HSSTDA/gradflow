'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { useMeetingsStore } from '@/store/meetingsStore';
import { useMilestonesStore } from '@/store/milestonesStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'timeline' | 'calendar';

interface GanttSubtask {
  id:         string;
  label:      string;
  start:      string; // ISO date string
  end:        string; // ISO date string
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
  id:      string;
  date:    Date;
  label:   string;
  type:    'task' | 'meeting';
  color:   string;
  bgColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_WIDTH      = 28
const PARENT_ROW_H   = 36
const SUBTASK_ROW_H  = 32
const TASK_COLORS = ['#D4500A','#2563EB','#16A34A','#7C3AED','#D97706','#0891B2','#DC2626']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function parseDate(str: string): Date {
  return new Date(str)
}

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function getCalendarDays(year: number, month: number) {
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const prevDays       = new Date(year, month, 0).getDate()

  const prevMonth = month === 0  ? 11 : month - 1
  const prevYear  = month === 0  ? year - 1 : year
  const nextMonth = month === 11 ? 0  : month + 1
  const nextYear  = month === 11 ? year + 1 : year

  type Cell = { day: number; month: number; year: number; isCurrentMonth: boolean }
  const cells: Cell[] = []

  for (let i = firstDayOfWeek - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, month: prevMonth, year: prevYear, isCurrentMonth: false })

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month, year, isCurrentMonth: true })

  for (let d = 1; cells.length < 42; d++)
    cells.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false })

  return cells
}

// ─── TimelinePage ─────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [view,      setView]      = useState<ViewMode>('timeline')
  const [calYear,   setCalYear]   = useState(() => new Date().getFullYear())
  const [calMonth,  setCalMonth]  = useState(() => new Date().getMonth())
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const workspaceId               = useAuthStore(s => s.currentWorkspace?.id)
  const { tasks, fetchTasks }     = useTasksStore()
  const { meetings, fetchMeetings } = useMeetingsStore()
  const { milestones, fetchMilestones } = useMilestonesStore()

  useEffect(() => {
    if (!workspaceId) return
    fetchTasks(workspaceId)
    fetchMeetings(workspaceId)
    fetchMilestones(workspaceId)
  }, [workspaceId])

  // ── Build Gantt data ────────────────────────────────────────────────────────
  // Filter first, then assign colors — so index 0 is always the first *visible* task
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PARENT_TASKS: GanttParentTask[] = (tasks as any[])
    .map((task) => ({
      id:    task.id,
      label: task.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtasks: task.subtasks.filter((s: any) => s.dueDate).map((s: any) => ({
        id:        s.id,
        label:     s.title,
        start:     s.createdAt ?? s.dueDate,
        end:       s.dueDate,
        done:      s.done,
        dependsOn: s.dependsOnId || undefined,
      })),
    }))
    .filter((t) => t.subtasks.length > 0)
    .map((t, index) => ({ ...t, color: TASK_COLORS[index % TASK_COLORS.length] }))

  // ── Build Calendar events ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtaskEvents: CalendarEvent[] = (tasks as any[]).flatMap(task =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task.subtasks.filter((s: any) => s.dueDate).map((s: any): CalendarEvent => ({
      id:      s.id,
      date:    new Date(s.dueDate),
      label:   s.title,
      type:    'task',
      color:   task.priority === 'HIGH'   ? 'var(--red)'
             : task.priority === 'MEDIUM' ? 'var(--amber)'
             : 'var(--blue)',
      bgColor: task.priority === 'HIGH'   ? 'var(--red-light)'
             : task.priority === 'MEDIUM' ? 'var(--amber-light)'
             : 'var(--blue-light)',
    }))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetingEvents: CalendarEvent[] = (meetings as any[]).map(m => ({
    id:      m.id,
    date:    new Date(m.date),
    label:   m.title,
    type:    'meeting' as const,
    color:   'var(--green)',
    bgColor: 'var(--green-light)',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const milestoneEvents: CalendarEvent[] = (milestones as any[])
    .filter(m => m.status !== 'COMPLETED')
    .map(m => ({
      id:      m.id,
      date:    new Date(m.dueDate),
      label:   m.title,
      type:    'task' as const,
      color:   m.status === 'DELAYED' ? 'var(--red)' : 'var(--accent)',
      bgColor: m.status === 'DELAYED' ? 'var(--red-light)' : 'var(--accent-light)',
    }))

  const CAL_EVENTS = [...subtaskEvents, ...meetingEvents, ...milestoneEvents]

  // ── Dynamic date range ──────────────────────────────────────────────────────
  const TODAY = new Date()

  const CHART_START   = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)
  const CHART_END_MIN = new Date(TODAY.getFullYear(), TODAY.getMonth() + 3, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDates = (tasks as any[]).flatMap((t: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.subtasks.filter((s: any) => s.dueDate).map((s: any) => new Date(s.dueDate))
  )
  const latestTaskDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d: Date) => d.getTime())))
    : CHART_END_MIN

  const CHART_END   = latestTaskDate > CHART_END_MIN ? latestTaskDate : CHART_END_MIN
  const todayOffset = daysBetween(CHART_START, TODAY) * DAY_WIDTH
  const TOTAL_DAYS  = Math.max(1, daysBetween(CHART_START, CHART_END))
  const CHART_WIDTH = TOTAL_DAYS * DAY_WIDTH

  // Week markers for the date header row
  const weekMarkers: Date[] = []
  {
    const d = new Date(CHART_START)
    while (d <= CHART_END) {
      weekMarkers.push(new Date(d))
      d.setDate(d.getDate() + 7)
    }
  }

  // Row 1 — month blocks using UTC calendar-month boundaries
  type MonthBlock = { label: string; left: number; width: number }
  const MONTH_HEADER: MonthBlock[] = []
  {
    let mYear  = CHART_START.getUTCFullYear()
    let mMonth = CHART_START.getUTCMonth()
    while (true) {
      const monthStartTs = Date.UTC(mYear, mMonth, 1)
      const nextMonthTs  = Date.UTC(mYear, mMonth + 1, 1)
      if (monthStartTs > CHART_END.getTime()) break
      const leftDays  = Math.max(0, Math.round((monthStartTs - CHART_START.getTime()) / 86400000))
      const rightDays = Math.min(TOTAL_DAYS, Math.round((nextMonthTs - CHART_START.getTime()) / 86400000))
      if (rightDays > leftDays) {
        MONTH_HEADER.push({
          label: new Date(monthStartTs).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).toUpperCase(),
          left:  leftDays  * DAY_WIDTH,
          width: (rightDays - leftDays) * DAY_WIDTH,
        })
      }
      mMonth++
      if (mMonth > 11) { mMonth = 0; mYear++ }
    }
  }

  // ── Pre-compute bar positions (shared by render + SVG arrows) ───────────────
  // Phase 1: base positions from own dates
  const baseBarPos: Record<string, { left: number; width: number }> = {}
  for (const parent of PARENT_TASKS) {
    for (const sub of parent.subtasks) {
      baseBarPos[sub.id] = {
        left:  Math.max(0, daysBetween(CHART_START, parseDate(sub.start)) * DAY_WIDTH),
        width: Math.max(80, daysBetween(parseDate(sub.start), parseDate(sub.end)) * DAY_WIDTH),
      }
    }
  }

  // Phase 2: shift each dependent bar to start no earlier than its dependency's right edge
  type BarInfo = { barLeft: number; barRight: number; centerY: number }
  const barMap: Record<string, BarInfo> = {}
  {
    let y = 0
    for (const parent of PARENT_TASKS) {
      y += PARENT_ROW_H
      for (const sub of parent.subtasks) {
        let bl = baseBarPos[sub.id].left
        if (sub.dependsOn) {
          // Use already-resolved barMap entry if dep came first, else fall back to base
          const depRight = barMap[sub.dependsOn]?.barRight
                        ?? ((baseBarPos[sub.dependsOn]?.left ?? 0) + (baseBarPos[sub.dependsOn]?.width ?? 0))
          bl = Math.max(bl, depRight)
        }
        const bw = baseBarPos[sub.id].width
        barMap[sub.id] = { barLeft: bl, barRight: bl + bw, centerY: y + 6 + 10 }
        y += SUBTASK_ROW_H
      }
    }
  }

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const today   = new Date()
  const calDays = getCalendarDays(calYear, calMonth)

  function goPrev() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function goNext() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }
  function getEvents(year: number, month: number, day: number) {
    return CAL_EVENTS.filter(e =>
      e.date.getFullYear() === year &&
      e.date.getMonth()    === month &&
      e.date.getDate()     === day
    )
  }
  function isToday(year: number, month: number, day: number) {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
  }

  const prevLabel = `${MONTH_NAMES[calMonth === 0 ? 11 : calMonth - 1]} ${calMonth === 0 ? calYear - 1 : calYear}`
  const nextLabel = `${MONTH_NAMES[calMonth === 11 ? 0 : calMonth + 1]} ${calMonth === 11 ? calYear + 1 : calYear}`

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
  )

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

        {/* Empty state — shown when no subtasks have due dates */}
        {PARENT_TASKS.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📅</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              No tasks with due dates yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Add due dates to your to-dos to see them here.
            </p>
          </div>
        )}

        {/* Two-panel area */}
        {PARENT_TASKS.length > 0 && (
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
                    height:     PARENT_ROW_H,
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
                      height:       SUBTASK_ROW_H,
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
                  {/* Row 1 — Month labels (one block per calendar month) */}
                  <div style={{ height: 26, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                    {MONTH_HEADER.map(block => (
                      <div
                        key={block.label + block.left}
                        style={{
                          position:      'absolute',
                          left:          block.left,
                          width:         block.width,
                          height:        '100%',
                          paddingLeft:   10,
                          display:       'flex',
                          alignItems:    'center',
                          fontSize:      11,
                          fontWeight:    700,
                          letterSpacing: '0.6px',
                          color:         'var(--text-secondary)',
                          boxSizing:     'border-box',
                          overflow:      'hidden',
                          whiteSpace:    'nowrap',
                        }}
                      >
                        {block.label}
                      </div>
                    ))}
                  </div>

                  {/* Row 2 — Week markers */}
                  <div style={{ height: 26, position: 'relative', borderTop: '1px solid var(--border)' }}>
                    {weekMarkers.map((wDate, i) => {
                      const leftPx = daysBetween(CHART_START, wDate) * DAY_WIDTH
                      const label  = wDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      return (
                        <div
                          key={i}
                          style={{
                            position:   'absolute',
                            left:       leftPx,
                            top:        0,
                            height:     '100%',
                            width:      1,
                            borderLeft: '1px dashed var(--border)',
                          }}
                        >
                          <span style={{
                            position:   'absolute',
                            top:        '50%',
                            left:       4,
                            transform:  'translateY(-50%)',
                            fontSize:   10,
                            color:      'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Today line ── */}
                {TODAY >= CHART_START && TODAY <= CHART_END && (
                  <div style={{
                    position:      'absolute',
                    top:           52,
                    bottom:        0,
                    left:          todayOffset,
                    width:         1,
                    background:    'var(--accent)',
                    zIndex:        2,
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      position:   'absolute',
                      top:        4,
                      left:       4,
                      fontSize:   10,
                      fontWeight: 600,
                      color:      'var(--accent)',
                      whiteSpace: 'nowrap',
                    }}>
                      Today
                    </span>
                  </div>
                )}

                {/* ── Row backgrounds + bars ── */}
                {PARENT_TASKS.map(parent => (
                  <div key={parent.id}>
                    {/* Parent row bg — no bar */}
                    <div style={{
                      height:          PARENT_ROW_H,
                      width:           '100%',
                      background:      parent.color + '08',
                      borderBottom:    '1px solid var(--border)',
                      backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH}px)`,
                    }} />

                    {/* Subtask rows */}
                    {parent.subtasks.map(sub => {
                      const { barLeft, barRight } = barMap[sub.id]
                      const barWidth = barRight - barLeft
                      const hovered  = hoveredId === sub.id

                      return (
                        <div key={sub.id} style={{
                          height:          SUBTASK_ROW_H,
                          width:           '100%',
                          borderBottom:    '1px solid var(--border)',
                          position:        'relative',
                          backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH - 1}px, var(--border) ${DAY_WIDTH}px)`,
                        }}>
                          {/* Bar */}
                          <div
                            onMouseEnter={() => setHoveredId(sub.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{
                              position:     'absolute',
                              top:          6,
                              left:         barLeft,
                              width:        barWidth,
                              height:       20,
                              borderRadius: 10,
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
                            {barWidth > 60 && (
                              <div style={{
                                position:   'absolute',
                                left:       0,
                                top:        0,
                                bottom:     0,
                                display:    'flex',
                                alignItems: 'center',
                                fontSize:   11,
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
                              {sub.label}  ·  {fmtShort(sub.start)} → {fmtShort(sub.end)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* ── Dependency arrows ── */}
                {(() => {
                  const paths: React.ReactElement[] = []
                  for (const parent of PARENT_TASKS) {
                    for (const sub of parent.subtasks) {
                      if (!sub.dependsOn) continue
                      const source = barMap[sub.dependsOn]
                      const target = barMap[sub.id]
                      if (!source || !target) continue
                      const sx   = source.barRight
                      const sy   = source.centerY
                      const tx   = target.barLeft
                      const ty   = target.centerY
                      const midX = (sx + tx) / 2
                      paths.push(
                        <path
                          key={sub.id + '_dep'}
                          d={`M ${sx} ${sy} C ${midX} ${sy} ${midX} ${ty} ${tx} ${ty}`}
                          stroke="var(--accent)"
                          strokeWidth="1.5"
                          strokeOpacity="0.6"
                          fill="none"
                          markerEnd="url(#arrow)"
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
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L0,6 L6,3 z" fill="var(--accent)" fillOpacity="0.6" />
                        </marker>
                      </defs>
                      {paths}
                    </svg>
                  )
                })()}

              </div>
            </div>
          </div>
        )}
      </div>
    )
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
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';        e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          ← {prevLabel}
        </button>

        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </span>

        <button
          onClick={goNext}
          style={{ border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';        e.currentTarget.style.color = 'var(--text-secondary)' }}
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
            const todayCell = isToday(cell.year, cell.month, cell.day)
            const events    = getEvents(cell.year, cell.month, cell.day)
            const col       = idx % 7
            const row       = Math.floor(idx / 7)

            return (
              <div
                key={idx}
                style={{
                  minHeight:    88,
                  borderRight:  col < 6 ? '1px solid var(--border)' : 'none',
                  borderBottom: row < 5 ? '1px solid var(--border)' : 'none',
                  padding:      8,
                  overflow:     'hidden',
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

                {events.slice(0, 2).map((ev, ei) => (
                  <div
                    key={ei}
                    title={ev.label}
                    style={{
                      display:      'block',
                      width:        '100%',
                      boxSizing:    'border-box',
                      marginTop:    2,
                      borderRadius: 4,
                      padding:      '2px 6px',
                      fontSize:     11,
                      fontWeight:   600,
                      background:   ev.bgColor,
                      color:        ev.color,
                      overflow:     'hidden',
                      whiteSpace:   'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ev.label}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
