import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { guestSchema } from '../validators/guestValidator';
import { AppError } from '../middleware/errorHandler';

export const getAllGuests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw!, 1), 50) : q ? 20 : undefined;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    });

    // Enrich with matching User / Shareholder by email so admin pickers show identity.
    const emails = [
      ...new Set(
        guests
          .map((g) => g.email?.trim().toLowerCase())
          .filter((e): e is string => !!e)
      ),
    ];

    let extraShareholders: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
      shareType: string;
      shareValue: number;
      userId: string | null;
    }[] = [];
    let extraUsers: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
    }[] = [];

    if (q) {
      const [shMatches, userMatches] = await Promise.all([
        prisma.shareholder.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 20,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            shareType: true,
            shareValue: true,
            userId: true,
          },
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 20,
          select: { id: true, name: true, email: true, phone: true, role: true },
        }),
      ]);
      extraShareholders = shMatches;
      extraUsers = userMatches;
    }

    if (emails.length > 0) {
      const [byEmailSh, byEmailUser] = await Promise.all([
        prisma.shareholder.findMany({
          where: {
            OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })),
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            shareType: true,
            shareValue: true,
            userId: true,
          },
        }),
        prisma.user.findMany({
          where: {
            OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })),
          },
          select: { id: true, name: true, email: true, phone: true, role: true },
        }),
      ]);
      for (const s of byEmailSh) {
        if (!extraShareholders.some((x) => x.id === s.id)) extraShareholders.push(s);
      }
      for (const u of byEmailUser) {
        if (!extraUsers.some((x) => x.id === u.id)) extraUsers.push(u);
      }
    }

    const shByEmail = new Map(
      extraShareholders
        .filter((s) => s.email)
        .map((s) => [s.email!.toLowerCase(), s] as const)
    );
    const userByEmail = new Map(extraUsers.map((u) => [u.email.toLowerCase(), u] as const));

    type Enriched = (typeof guests)[number] & {
      shareholder: {
        id: string;
        name: string;
        phone?: string | null;
        email: string | null;
        shareType: string;
        shareValue: number;
      } | null;
      user: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        role: string;
      } | null;
    };

    const enriched: Enriched[] = guests.map((g) => {
      const em = g.email?.trim().toLowerCase();
      const shareholder = em ? shByEmail.get(em) ?? null : null;
      const user = em ? userByEmail.get(em) ?? null : null;
      return {
        ...g,
        // Prefer guest phone; then staff user / shareholder phone
        phone: g.phone || user?.phone || shareholder?.phone || '',
        email: g.email ?? null,
        shareholder: shareholder
          ? {
              id: shareholder.id,
              name: shareholder.name,
              phone: shareholder.phone,
              email: shareholder.email,
              shareType: shareholder.shareType,
              shareValue: shareholder.shareValue,
            }
          : null,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
            }
          : null,
      };
    });

    // Shareholders / staff matched by search but with no Guest row — still show in Find guest.
    const linked: Enriched[] = [];
    if (q) {
      const guestEmails = new Set(
        enriched.map((g) => g.email?.trim().toLowerCase()).filter(Boolean) as string[]
      );
      for (const s of extraShareholders) {
        const em = s.email?.trim().toLowerCase();
        if (em && guestEmails.has(em)) continue;
        if (enriched.some((g) => g.shareholder?.id === s.id)) continue;

        const linkedUser =
          (s.userId && extraUsers.find((u) => u.id === s.userId)) ||
          (em ? userByEmail.get(em) : undefined) ||
          null;

        linked.push({
          id: `shareholder:${s.id}`,
          name: s.name,
          phone: s.phone || linkedUser?.phone || '',
          nid: null,
          passport: null,
          address: null,
          email: s.email,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          shareholder: {
            id: s.id,
            name: s.name,
            phone: s.phone,
            email: s.email,
            shareType: s.shareType,
            shareValue: s.shareValue,
          },
          user: linkedUser
            ? {
                id: linkedUser.id,
                name: linkedUser.name,
                email: linkedUser.email,
                phone: linkedUser.phone,
                role: linkedUser.role,
              }
            : null,
        });
        if (em) guestEmails.add(em);
      }

      for (const u of extraUsers) {
        const em = u.email.trim().toLowerCase();
        if (guestEmails.has(em)) continue;
        if (enriched.some((g) => g.user?.id === u.id)) continue;
        if (linked.some((g) => g.user?.id === u.id)) continue;

        linked.push({
          id: `user:${u.id}`,
          name: u.name,
          phone: u.phone || '',
          nid: null,
          passport: null,
          address: null,
          email: u.email,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          shareholder: null,
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
          },
        });
        guestEmails.add(em);
      }
    }

    const combined = [...enriched, ...linked];
    res.json({
      success: true,
      guests: limit ? combined.slice(0, limit) : combined,
    });
  } catch (error) {
    next(error);
  }
};

export const getGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!guest) {
      throw new AppError('Guest not found', 404);
    }

    res.json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const createGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = guestSchema.parse(req.body);

    const guest = await prisma.guest.create({
      data,
    });

    res.status(201).json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const updateGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = guestSchema.partial().parse(req.body);

    const existing = await prisma.guest.findUnique({ where: { id } });
    if (!existing) throw new AppError('Guest not found', 404);

    const guest = await prisma.guest.update({ where: { id }, data });
    res.json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const deleteGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.guest.findUnique({ where: { id } });
    if (!existing) throw new AppError('Guest not found', 404);

    const activeBookings = await prisma.booking.count({
      where: { guestId: id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });
    if (activeBookings > 0) {
      throw new AppError('Cannot delete guest with active bookings', 400);
    }

    await prisma.guest.delete({ where: { id } });
    res.json({ success: true, message: 'Guest deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getGuestHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      throw new AppError('Guest not found', 404);
    }

    const bookings = await prisma.booking.findMany({
      where: { guestId: id },
      include: {
        room: { select: { id: true, name: true, type: true } },
        payments: true,
      },
      orderBy: { checkInDate: 'desc' },
    });

    const payments = bookings.flatMap((b) =>
      b.payments.map((p) => ({
        ...p,
        bookingRoomName: b.room?.name ?? null,
        bookingCheckIn: b.checkInDate,
      }))
    );

    const totalSpend = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const completedStays = bookings.filter(
      (b) => b.status === 'CHECKED_OUT'
    ).length;

    const lastStay = bookings.find((b) => b.status === 'CHECKED_OUT')?.checkOutDate ?? null;

    res.json({
      success: true,
      guest,
      bookings,
      payments,
      stats: {
        totalBookings: bookings.length,
        completedStays,
        totalSpend,
        lastStay,
      },
    });
  } catch (error) {
    next(error);
  }
};
