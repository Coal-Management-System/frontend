import type { UserRole } from '@/api/types'

/** A sidebar section; routes declare theirs in meta.section. */
export type Section =
  | 'dashboard'
  | 'batches'
  | 'labs'
  | 'warehouses'
  | 'piles'
  | 'movements'
  | 'dictionary'
  | 'qr'
  | 'activity'

const ALL: Section[] = [
  'dashboard',
  'batches',
  'labs',
  'warehouses',
  'piles',
  'movements',
  'dictionary',
  'qr',
  'activity'
]

// Sections only the admin may open, whatever roleSections says.
const ADMIN_ONLY: Section[] = ['activity']

// Roles not listed here see every section. This hides menus and blocks the
// pages in the browser only; the backend API does not check roles yet.
const roleSections: Partial<Record<UserRole, Section[]>> = {
  LAB_TECHNICIAN: ['dashboard', 'labs', 'dictionary'],
  WAREHOUSE_OPERATOR: ALL.filter(s => s !== 'labs')
}

export function sectionsFor(role: UserRole): Section[] {
  const sections = roleSections[role] ?? ALL
  return role === 'ADMIN' ? sections : sections.filter(s => !ADMIN_ONLY.includes(s))
}

export function canSee(role: UserRole | undefined, section: Section): boolean {
  return !!role && sectionsFor(role).includes(section)
}
