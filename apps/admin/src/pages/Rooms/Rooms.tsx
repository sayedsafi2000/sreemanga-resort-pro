import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { canManageRooms } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const roomTypeOptions = [
  { value: 'STANDARD', label: 'Single (Standard)' },
  { value: 'DELUXE', label: 'Double (Deluxe)' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'PRESIDENTIAL', label: 'Presidential' },
];
const roomStatuses = ['AVAILABLE', 'BOOKED', 'CLEANING', 'MAINTENANCE'];
const bedTypes = ['SINGLE', 'DOUBLE', 'KING', 'TWIN'];

type AddOn = { name: string; price: string; description: string };
type BoolMap = Record<string, boolean>;

type FoodOptionsForm = {
  freeBreakfast: boolean;
  breakfastType: string;
  lunchIncluded: boolean;
  dinnerIncluded: boolean;
  unlimitedTeaCoffee: boolean;
  roomServiceAvailable: boolean;
};

type RoomForm = {
  name: string;
  roomCode: string;
  type: string;
  description: string;
  floorBuilding: string;
  price: string;
  weekendPrice: string;
  seasonalPrice: string;
  extraGuestCharge: string;
  roomSizeSqft: string;
  capacity: string;
  maxAdults: string;
  maxChildren: string;
  bedType: string;
  status: string;
  mainImage: string;
  images: string[];
  facilities: BoolMap;
  foodOptions: FoodOptionsForm;
  services: BoolMap;
  experienceFeatures: BoolMap;
  addOns: AddOn[];
  bookingRules: {
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: string;
    refundPolicy: string;
  };
};

const defaultForm = (): RoomForm => ({
  name: '',
  roomCode: '',
  type: 'STANDARD',
  description: '',
  floorBuilding: '',
  price: '',
  weekendPrice: '',
  seasonalPrice: '',
  extraGuestCharge: '',
  roomSizeSqft: '',
  capacity: '',
  maxAdults: '',
  maxChildren: '',
  bedType: '',
  status: 'AVAILABLE',
  mainImage: '',
  images: [],
  facilities: {
    ac: false,
    wifi: false,
    tv: false,
    hotWater: false,
    privateBathroom: false,
    balcony: false,
    gardenView: false,
    riverView: false,
  },
  foodOptions: {
    freeBreakfast: false,
    breakfastType: '',
    lunchIncluded: false,
    dinnerIncluded: false,
    unlimitedTeaCoffee: false,
    roomServiceAvailable: false,
  },
  services: {
    dailyCleaning: false,
    laundryService: false,
    reception24x7: false,
  },
  experienceFeatures: {
    swimmingPoolAccess: false,
    bonfireAccess: false,
    gardenAccess: false,
    walkingTrailAccess: false,
  },
  addOns: [],
  bookingRules: {
    checkInTime: '',
    checkOutTime: '',
    cancellationPolicy: '',
    refundPolicy: '',
  },
});

const Rooms: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const manage = canManageRooms(role);
  const hkOnly = role === 'HOUSEKEEPING';

  const [rooms, setRooms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<RoomForm>(defaultForm());

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(unwrapList(res, ['rooms']));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (room: any) => {
    setEditing(room);
    setForm({
      ...defaultForm(),
      name: room.name,
      roomCode: room.roomCode || '',
      type: room.type,
      price: String(room.price),
      capacity: String(room.capacity ?? ''),
      weekendPrice: room.weekendPrice ? String(room.weekendPrice) : '',
      seasonalPrice: room.seasonalPrice ? String(room.seasonalPrice) : '',
      extraGuestCharge: room.extraGuestCharge ? String(room.extraGuestCharge) : '',
      roomSizeSqft: room.roomSizeSqft ? String(room.roomSizeSqft) : '',
      maxAdults: room.maxAdults ? String(room.maxAdults) : '',
      maxChildren: room.maxChildren ? String(room.maxChildren) : '',
      bedType: room.bedType || '',
      floorBuilding: room.floorBuilding || '',
      description: room.description || '',
      status: room.status,
      mainImage: room.mainImage || '',
      images: Array.isArray(room.images) ? room.images : [],
      facilities: { ...defaultForm().facilities, ...(room.facilities || {}) },
      foodOptions: { ...defaultForm().foodOptions, ...(room.foodOptions || {}) },
      services: { ...defaultForm().services, ...(room.services || {}) },
      experienceFeatures: { ...defaultForm().experienceFeatures, ...(room.experienceFeatures || {}) },
      addOns: Array.isArray(room.addOns)
        ? room.addOns.map((a: any) => ({ name: a.name || '', price: String(a.price ?? ''), description: a.description || '' }))
        : [],
      bookingRules: { ...defaultForm().bookingRules, ...(room.bookingRules || {}) },
    });
    setOpen(true);
  };

  const toNumber = (v: string): number | undefined => (v === '' ? undefined : Number(v));
  const prune = (value: any): any => {
    if (Array.isArray(value)) {
      const arr = value.map(prune).filter((v) => v !== undefined);
      return arr.length ? arr : undefined;
    }
    if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      Object.entries(value).forEach(([k, v]) => {
        const p = prune(v);
        if (p !== undefined) out[k] = p;
      });
      return Object.keys(out).length ? out : undefined;
    }
    if (value === '' || value === null || value === undefined || value === false) return undefined;
    return value;
  };

  const buildPayload = () => {
    const payload = {
      name: form.name,
      roomCode: form.roomCode,
      type: form.type,
      description: form.description,
      floorBuilding: form.floorBuilding,
      price: toNumber(form.price),
      weekendPrice: toNumber(form.weekendPrice),
      seasonalPrice: toNumber(form.seasonalPrice),
      extraGuestCharge: toNumber(form.extraGuestCharge),
      roomSizeSqft: toNumber(form.roomSizeSqft),
      capacity: toNumber(form.capacity),
      maxAdults: toNumber(form.maxAdults),
      maxChildren: toNumber(form.maxChildren),
      bedType: form.bedType || undefined,
      status: form.status,
      mainImage: form.mainImage,
      images: form.images,
      facilities: form.facilities,
      foodOptions: form.foodOptions,
      services: form.services,
      experienceFeatures: form.experienceFeatures,
      addOns: form.addOns.map((a) => ({ name: a.name, price: toNumber(a.price), description: a.description })),
      bookingRules: form.bookingRules,
    };
    return prune(payload);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleMainImageFile = async (file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, mainImage: dataUrl, images: [dataUrl, ...f.images.filter((i) => i !== dataUrl)] }));
  };

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
  };

  const handleSave = async () => {
    try {
      if (hkOnly && editing) {
        await api.put(`/rooms/${editing.id}`, { status: form.status });
      } else if (editing) {
        await api.put(`/rooms/${editing.id}`, buildPayload());
      } else {
        await api.post('/rooms', buildPayload());
      }
      setOpen(false);
      fetchRooms();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    try { await api.delete(`/rooms/${id}`); fetchRooms(); } catch (err) { console.error(err); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'AVAILABLE': return 'success';
      case 'BOOKED': return 'default';
      case 'CLEANING': return 'warning';
      case 'MAINTENANCE': return 'destructive';
      default: return 'outline';
    }
  };

  const showActions = manage || hkOnly;
  const allowDelete = manage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rooms</h1>
        {manage && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Room</Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Price</TableHead>
                <TableHead>Capacity</TableHead><TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.type}</TableCell>
                  <TableCell>৳{room.price.toLocaleString()}</TableCell>
                  <TableCell>{room.maxAdults || room.capacity}A / {room.maxChildren || 0}C</TableCell>
                  <TableCell><Badge variant={statusColor(room.status) as any}>{room.status}</Badge></TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(room)}><Pencil className="h-4 w-4" /></Button>
                      {allowDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">No rooms found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {!editing ? 'Add Room' : hkOnly ? 'Update room status' : 'Edit Room'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!hkOnly && (
              <>
                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">1. Basic Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Room Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Room Code</Label><Input value={form.roomCode} onChange={(e) => setForm({ ...form, roomCode: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Room Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roomTypeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Floor / Building</Label><Input value={form.floorBuilding} onChange={(e) => setForm({ ...form, floorBuilding: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">2. Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Base Price per night *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Weekend Price</Label><Input type="number" value={form.weekendPrice} onChange={(e) => setForm({ ...form, weekendPrice: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Seasonal Price</Label><Input type="number" value={form.seasonalPrice} onChange={(e) => setForm({ ...form, seasonalPrice: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Extra Guest Charge</Label><Input type="number" value={form.extraGuestCharge} onChange={(e) => setForm({ ...form, extraGuestCharge: e.target.value })} /></div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">3. Capacity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Room Size (sq ft)</Label><Input type="number" value={form.roomSizeSqft} onChange={(e) => setForm({ ...form, roomSizeSqft: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Capacity (fallback)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Max Adults</Label><Input type="number" value={form.maxAdults} onChange={(e) => setForm({ ...form, maxAdults: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Max Children</Label><Input type="number" value={form.maxChildren} onChange={(e) => setForm({ ...form, maxChildren: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Bed Type</Label><Select value={form.bedType || '__none'} onValueChange={(v) => setForm({ ...form, bedType: v === '__none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Select bed type" /></SelectTrigger><SelectContent><SelectItem value="__none">Not set</SelectItem>{bedTypes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">4. Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Main Image upload</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleMainImageFile(e.target.files?.[0])} />
                      <Input placeholder="or paste main image URL" value={form.mainImage} onChange={(e) => setForm({ ...form, mainImage: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gallery images upload</Label>
                      <Input type="file" multiple accept="image/*" onChange={(e) => handleGalleryFiles(e.target.files)} />
                      <Input placeholder="or add image URL and press Enter" onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v) setForm((f) => ({ ...f, images: [...f.images, v] }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {form.images.map((img, idx) => (
                      <div key={`${img}-${idx}`} className="relative border rounded p-1">
                        <img src={img} alt="room" className="h-16 w-full object-cover rounded" />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">5-8. Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {Object.entries({
                      facilities: ['ac', 'wifi', 'tv', 'hotWater', 'privateBathroom', 'balcony', 'gardenView', 'riverView'],
                      foodOptions: ['freeBreakfast', 'lunchIncluded', 'dinnerIncluded', 'unlimitedTeaCoffee', 'roomServiceAvailable'],
                      services: ['dailyCleaning', 'laundryService', 'reception24x7'],
                      experienceFeatures: ['swimmingPoolAccess', 'bonfireAccess', 'gardenAccess', 'walkingTrailAccess'],
                    }).map(([group, keys]) => (
                      <div key={group} className="space-y-2">
                        <p className="font-medium capitalize">{group.replace(/([A-Z])/g, ' $1')}</p>
                        {keys.map((k) => (
                          <label key={k} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean((form as any)[group][k])}
                              onChange={(e) => setForm((f) => ({ ...f, [group]: { ...(f as any)[group], [k]: e.target.checked } } as any))}
                            />
                            <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        ))}
                        {group === 'foodOptions' && (form.foodOptions.freeBreakfast || form.foodOptions.lunchIncluded || form.foodOptions.dinnerIncluded) && (
                          <div className="space-y-1">
                            <Label>Breakfast Type</Label>
                            <Select value={form.foodOptions.breakfastType || '__none'} onValueChange={(v) => setForm((f) => ({ ...f, foodOptions: { ...f.foodOptions, breakfastType: v === '__none' ? '' : v } }))}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">Not set</SelectItem>
                                <SelectItem value="BUFFET">Buffet</SelectItem>
                                <SelectItem value="SET_MENU">Set Menu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">9. Add-ons</h3>
                  <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, addOns: [...f.addOns, { name: '', price: '', description: '' }] }))}>Add Add-on</Button>
                  <div className="space-y-3">
                    {form.addOns.map((a, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 border rounded p-2">
                        <Input placeholder="Name" value={a.name} onChange={(e) => setForm((f) => ({ ...f, addOns: f.addOns.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} />
                        <Input placeholder="Price" type="number" value={a.price} onChange={(e) => setForm((f) => ({ ...f, addOns: f.addOns.map((x, i) => i === idx ? { ...x, price: e.target.value } : x) }))} />
                        <Input placeholder="Description" value={a.description} onChange={(e) => setForm((f) => ({ ...f, addOns: f.addOns.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) }))} />
                        <Button type="button" variant="ghost" onClick={() => setForm((f) => ({ ...f, addOns: f.addOns.filter((_, i) => i !== idx) }))}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold">10. Booking Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Check-in Time</Label><Input type="time" value={form.bookingRules.checkInTime} onChange={(e) => setForm((f) => ({ ...f, bookingRules: { ...f.bookingRules, checkInTime: e.target.value } }))} /></div>
                    <div className="space-y-2"><Label>Check-out Time</Label><Input type="time" value={form.bookingRules.checkOutTime} onChange={(e) => setForm((f) => ({ ...f, bookingRules: { ...f.bookingRules, checkOutTime: e.target.value } }))} /></div>
                    <div className="space-y-2"><Label>Cancellation Policy</Label><Input value={form.bookingRules.cancellationPolicy} onChange={(e) => setForm((f) => ({ ...f, bookingRules: { ...f.bookingRules, cancellationPolicy: e.target.value } }))} /></div>
                    <div className="space-y-2"><Label>Refund Policy</Label><Input value={form.bookingRules.refundPolicy} onChange={(e) => setForm((f) => ({ ...f, bookingRules: { ...f.bookingRules, refundPolicy: e.target.value } }))} /></div>
                  </div>
                </div>
              </>
            )}
            {editing && (
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roomStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rooms;
