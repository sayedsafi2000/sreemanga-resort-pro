import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type Log = {
  id: string; action: string; entity: string; entityId?: string | null;
  method?: string | null; path?: string | null; userName?: string | null; userRole?: string | null;
  ipAddress?: string | null; createdAt: string;
};

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entity) params.set('entity', entity);
      if (action) params.set('action', action);
      const qs = params.toString() ? `?${params}` : '';
      const r = await api.get(`/audit-logs${qs}`);
      setLogs(unwrapList<Log>(r, ['logs']));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Record of all data changes across the system"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">Entity</Label><Input className="w-40" placeholder="e.g. Payment" value={entity} onChange={(e) => setEntity(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Action</Label><Input className="w-32" placeholder="CREATE" value={action} onChange={(e) => setAction(e.target.value)} /></div>
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Filter</Button>
          </div>
        }
      />

      <Card><CardContent className="p-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead>
              <TableHead>Entity</TableHead><TableHead>Path</TableHead><TableHead>IP</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell><div className="font-medium">{l.userName ?? '—'}</div><div className="text-xs text-muted-foreground">{l.userRole ?? ''}</div></TableCell>
                  <TableCell><Badge className={ACTION_COLOR[l.action] ?? 'bg-gray-100 text-gray-700'}>{l.action}</Badge></TableCell>
                  <TableCell>{l.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{l.method} {l.path}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.ipAddress ?? '—'}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit records.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
};

export default AuditLog;
