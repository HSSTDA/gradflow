'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import s from './TopNav.module.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', badge: false },
  { id: 'important', label: 'Important',  badge: false },
  { id: 'tasks',     label: 'Tasks',      badge: true  },
  { id: 'chat',      label: 'Chat',       badge: true  },
  { id: 'files',     label: 'Files',      badge: false },
  { id: 'timeline',  label: 'Timeline',   badge: false },
  { id: 'meetings',  label: 'Meetings',   badge: false },
] as const;

interface TopNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function TopNav({ activePage, onNavigate }: TopNavProps) {
  const [scrolledDown, setScrolledDown] = useState(false);
  const [mouseNearTop, setMouseNearTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledDown(window.scrollY > 40);
    const onMouseMove = (e: MouseEvent) => setMouseNearTop(e.clientY < 60);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const hidden = scrolledDown && !mouseNearTop;

  return (
    <nav className={clsx(s.nav, hidden && s.hidden)}>
      {NAV_ITEMS.map(({ id, label, badge }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={clsx(s.navLink, activePage === id && s.active)}
        >
          {label}
          {badge && <span className={s.dot} />}
        </button>
      ))}
    </nav>
  );
}
