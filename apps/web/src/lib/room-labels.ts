import type { RoomType, RoomZone } from '@/types/resort';

export const ROOM_TYPE_LABEL: Record<RoomType, { en: string; bn: string }> = {
  STANDARD: { en: 'Standard', bn: 'স্ট্যান্ডার্ড' },
  COUPLE: { en: 'Couple', bn: 'কাপল' },
  DELUXE: { en: 'Deluxe', bn: 'ডিলাক্স' },
  SUITE: { en: 'Suite', bn: 'স্যুট' },
  FAMILY: { en: 'Family', bn: 'ফ্যামিলি' },
  PRESIDENTIAL: { en: 'Presidential', bn: 'প্রেসিডেনশিয়াল' },
};

export const ROOM_TYPES: RoomType[] = ['COUPLE', 'FAMILY', 'STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL'];

/** Room categories as they exist on the property: the Tower Building and three cottage zones. */
export const ROOM_ZONE_LABEL: Record<RoomZone, { en: string; bn: string }> = {
  TOWER: { en: 'Tower Building', bn: 'টাওয়ার বিল্ডিং' },
  ZONE_1: { en: 'Zone 1', bn: 'জোন ১' },
  ZONE_2: { en: 'Zone 2', bn: 'জোন ২' },
  ZONE_3: { en: 'Zone 3', bn: 'জোন ৩' },
};

export const ROOM_ZONES: RoomZone[] = ['TOWER', 'ZONE_1', 'ZONE_2', 'ZONE_3'];

export const isRoomZone = (v: string | undefined | null): v is RoomZone => !!v && (ROOM_ZONES as string[]).includes(v);
