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

const ALL: Section[] = [
  'dashboard',
  'batches',
  'labs',
  'warehouses',
  'piles',
  'movements',
  'dictionary',
  'qr'
]

// Roles not listed here see every section. This hides menus and blocks the
// pages in the browser only; the backend API does not check roles yet.
const roleSections: Partial<Record<UserRole, Section[]>> = {
  LAB_TECHNICIAN: ['dashboard', 'labs', 'dictionary'],
  WAREHOUSE_OPERATOR: ALL.filter(s => s !== 'labs')
}

export function sectionsFor(role: UserRole): Section[] {
  return roleSections[role] ?? ALL
}

export function canSee(role: UserRole | undefined, section: Section): boolean {
  return !!role && sectionsFor(role).includes(section)
}
