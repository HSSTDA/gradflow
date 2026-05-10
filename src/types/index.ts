import type { LucideIcon } from 'lucide-react';

export interface Member {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  tasks: number;
  done: number;
  lastSeen: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
  memberId: string;
  status: 'todo' | 'inprogress' | 'done';
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface PinnedItem {
  id: string;
  type: 'red' | 'blue' | 'green' | 'amber';
  title: string;
  body: string;
  by: string;
  tag: string;
}

export interface Milestone {
  date: string;
  title: string;
  desc: string;
  status: 'done' | 'active' | 'upcoming';
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendeeIds: string[];
  notes: string;
  actions: string[];
}

export interface ChatRoom {
  id: string;
  name: string;
  preview: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  time: string;
  isSelf: boolean;
}

export interface FileItem {
  name: string;
  size: string;
  type: string;
  color: string;
  date: string;
  folder: string;
}
