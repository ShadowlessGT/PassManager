import {
  AtSign, Car, Gamepad2, Globe2, HeartPulse, House,
  KeyRound, Mail, PawPrint, UserRound
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Password Safe's Icons.EntryID references individual Passwords.ID records.
 * Keep source IDs stable so future exports retain the original selection.
 */
export const ENTRY_ICON_CHOICES = [
  { id: 'house', label: 'Haus', Icon: House },
  { id: 'health', label: 'Gesundheit', Icon: HeartPulse },
  { id: 'account', label: 'Benutzerkonto', Icon: UserRound },
  { id: 'world', label: 'Welt', Icon: Globe2 },
  { id: 'twitter', label: 'Soziale Medien', Icon: AtSign },
  { id: 'mail', label: 'E-Mail', Icon: Mail },
  { id: 'gaming', label: 'Gaming', Icon: Gamepad2 },
  { id: 'car', label: 'Auto', Icon: Car },
  { id: 'animal', label: 'Tier', Icon: PawPrint }
] satisfies { id: string; label: string; Icon: LucideIcon }[];

export function entryIconFor(id: string | undefined): LucideIcon {
  return ENTRY_ICON_CHOICES.find(choice => choice.id === id)?.Icon ?? KeyRound;
}

export function EntryIcon({ id, size = 25 }: { id?: string; size?: number }) {
  const Icon = entryIconFor(id);
  return <Icon size={size} aria-hidden="true" />;
}
