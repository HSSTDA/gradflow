import { create } from 'zustand'

export type ItemType = 'red' | 'blue' | 'green' | 'amber'
export type Category = 'Instructions' | 'Critical' | 'Decision' | 'Resources'

export interface PinnedItem {
  id:       string
  type:     ItemType
  category: Category
  title:    string
  body:     string
  by:       string
  date:     string
  pinned:   boolean
}

interface ImportantStore {
  items:      PinnedItem[]
  addItem:    (item: PinnedItem) => void
  togglePin:  (id: string) => void
  removeItem: (id: string) => void
}

export const useImportantStore = create<ImportantStore>((set) => ({
  items: [
    {
      id: 'i1', type: 'red', category: 'Instructions', pinned: true,
      title: '⚡ Supervisor Feedback — Week 8',
      body:  'Dr. Khalid wants the system to support multi-user roles.\nMake sure the DB schema reflects this before the next meeting.\nAlso requested: add an activity log for all major user actions.',
      by: 'Sara Ahmed', date: 'May 5',
    },
    {
      id: 'i2', type: 'red', category: 'Critical', pinned: true,
      title: '📋 Final Submission Requirements',
      body:  '1. Full documentation — minimum 80 pages\n2. Source code pushed to GitHub (clean commits)\n3. Demo video: 5–7 minutes\n4. Abstract in both English and Arabic\n5. System deployed on live server before June 18',
      by: 'Dr. Khalid', date: 'Apr 28',
    },
    {
      id: 'i3', type: 'green', category: 'Decision', pinned: true,
      title: '✅ Agreed Development Stack',
      body:  'Frontend: React + Tailwind CSS\nBackend: Node.js + Express\nDatabase: PostgreSQL\nHosting: Vercel (frontend) + Railway (backend)\nVersion control: GitHub — all commits must have clear messages',
      by: 'Omar Khalil', date: 'May 2',
    },
    {
      id: 'i4', type: 'amber', category: 'Resources', pinned: true,
      title: '🔗 Key Project Links',
      body:  'GitHub Repository · Figma Design File · Google Drive Folder · Supervisor Email Thread · Initial Proposal PDF',
      by: 'Omar Khalil', date: 'May 1',
    },
  ],

  addItem: (item) =>
    set((state) => ({ items: [item, ...state.items] })),

  togglePin: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id !== id ? i : { ...i, pinned: !i.pinned }
      ),
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}))
