import type { RoomType } from '@/types/resort';

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
  FAMILY: 'Family',
  PRESIDENTIAL: 'Presidential',
};

export const ROOM_TYPES: RoomType[] = ['STANDARD', 'DELUXE', 'SUITE', 'FAMILY', 'PRESIDENTIAL'];
