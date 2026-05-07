import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type Cell = {
  date: string;
  status: 'BOOKED' | 'FREE';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | null;
};

type RoomRow = {
  roomId: string;
  roomName: string;
  roomStatus: string;
  availability: Cell[];
};

type Props = {
  rooms: Array<{ id: string; name: string }>;
  onCreateForRoomDate?: (roomId: string, date: string) => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shortMonthDay(iso: string): { day: string; weekday: string } {
  const d = new Date(`${iso}T12:00:00.000Z`);
  return {
    day: String(d.getUTCDate()),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
  };
}

const cellClass = (cell: Cell): string => {
  if (cell.status === 'FREE') {
    return 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer';
  }
  switch (cell.bookingStatus) {
    case 'CHECKED_IN':
      return 'bg-blue-200 border-blue-300 cursor-not-allowed';
    case 'CONFIRMED':
      return 'bg-rose-200 border-rose-300 cursor-not-allowed';
    case 'PENDING':
      return 'bg-amber-200 border-amber-300 cursor-not-allowed';
    default:
      return 'bg-slate-200 border-slate-300 cursor-not-allowed';
  }
};

const AvailabilityCalendar: React.FC<Props> = ({ onCreateForRoomDate }) => {
  const [from, setFrom] = useState<string>(todayIso());
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms/availability-calendar?from=${from}&days=${days}`);
      const list = (res.data as { rooms?: RoomRow[] })?.rooms || [];
      setRows(list);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, days]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const dateHeaders = useMemo(() => {
    const first = rows[0]?.availability ?? [];
    return first.map((c) => ({ date: c.date, ...shortMonthDay(c.date) }));
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Range</Label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 30 | 60 | 90)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
        <Button variant="outline" onClick={fetchCalendar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Legend className="bg-emerald-50 border-emerald-200" label="Free (click to book)" />
          <Legend className="bg-amber-200 border-amber-300" label="Pending" />
          <Legend className="bg-rose-200 border-rose-300" label="Confirmed" />
          <Legend className="bg-blue-200 border-blue-300" label="Checked-in" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading && rows.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading calendar...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No rooms to display.
            </div>
          ) : (
            <div className="relative">
              <table className="border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-background border-b border-r px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[10rem]">
                      Room
                    </th>
                    {dateHeaders.map((h) => (
                      <th
                        key={h.date}
                        className="border-b px-1 py-1 text-center text-[10px] font-medium text-muted-foreground min-w-[2.5rem]"
                      >
                        <div className="leading-tight">
                          <div>{h.weekday}</div>
                          <div className="font-semibold">{h.day}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.roomId}>
                      <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 text-sm font-medium min-w-[10rem]">
                        {row.roomName}
                      </td>
                      {row.availability.map((cell) => (
                        <td
                          key={cell.date}
                          className="border-b p-0 min-w-[2.5rem]"
                          title={`${row.roomName} · ${cell.date} · ${
                            cell.status === 'FREE' ? 'free' : cell.bookingStatus || 'booked'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={cell.status === 'BOOKED'}
                            onClick={() =>
                              cell.status === 'FREE' &&
                              onCreateForRoomDate?.(row.roomId, cell.date)
                            }
                            className={`block w-full h-9 border ${cellClass(cell)}`}
                          >
                            <span className="sr-only">
                              {cell.date} {cell.status}
                            </span>
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Legend: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className="inline-flex items-center gap-1">
    <span className={`inline-block h-3 w-3 rounded border ${className}`} />
    {label}
  </span>
);

export default AvailabilityCalendar;
