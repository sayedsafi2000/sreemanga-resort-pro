import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Reports: React.FC = () => {
  const [rev, setRev] = useState<number | null>(null);
  const [occ, setOcc] = useState<{ rate: number; totalRooms: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, o] = await Promise.all([
          api.get('/reports/revenue'),
          api.get('/reports/occupancy'),
        ]);
        setRev(r.data?.totalRevenue ?? 0);
        setOcc({
          rate: Number(o.data?.occupancyRate ?? 0),
          totalRooms: Number(o.data?.totalRooms ?? 0),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Total revenue (completed payments)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">৳{(rev ?? 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Occupancy</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{occ ? `${occ.rate.toFixed(1)}%` : '—'}</p>
            <p className="text-sm text-muted-foreground">{occ?.totalRooms ?? 0} rooms</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
