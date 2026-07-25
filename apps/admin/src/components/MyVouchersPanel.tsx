import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';

export type MineVoucher = {
  id: string;
  name: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  appliesRoom: boolean;
  appliesDayLong: boolean;
  appliesRestaurant: boolean;
  expiresAt?: string | null;
  codeHint: string;
  assigneeType: string;
  expired?: boolean;
  redemptionCount?: number;
  remaining?: number | null;
};

type Props = {
  vouchers: MineVoucher[];
  title?: string;
  emptyHint?: string;
  /** When false, hide the whole panel if empty */
  showWhenEmpty?: boolean;
};

const MyVouchersPanel: React.FC<Props> = ({
  vouchers,
  title = 'My vouchers',
  emptyHint = 'No vouchers assigned to you.',
  showWhenEmpty = true,
}) => {
  if (!showWhenEmpty && vouchers.length === 0) return null;

  return (
    <div className="card-base p-5">
      <div className="mb-3 flex items-center gap-2">
        <Ticket className="h-4 w-4 text-amber-600" />
        <p className="eyebrow mb-0">{title}</p>
      </div>
      {vouchers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="space-y-3">
          {vouchers.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground">{v.name}</div>
                {v.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{v.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Badge variant="outline">
                    {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `৳${v.discountValue}`}
                  </Badge>
                  {v.appliesRoom && <Badge variant="outline">Room</Badge>}
                  {v.appliesDayLong && <Badge variant="outline">Day Long</Badge>}
                  {v.appliesRestaurant && <Badge variant="outline">Restaurant</Badge>}
                  {v.expired && <Badge className="bg-red-100 text-red-800">Expired</Badge>}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0">
                <div className="font-mono text-sm text-foreground">••••{v.codeHint}</div>
                <div>
                  {v.expiresAt
                    ? `Expires ${new Date(v.expiresAt).toLocaleDateString()}`
                    : 'No expiry'}
                </div>
                {v.remaining != null && <div>{v.remaining} uses left</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyVouchersPanel;
