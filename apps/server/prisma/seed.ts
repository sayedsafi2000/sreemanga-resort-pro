import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@resortnirjon.com';
  const hashed = await bcrypt.hash('Admin@12345', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Seed Admin', role: 'SUPER_ADMIN' },
    create: {
      email: adminEmail,
      name: 'Seed Admin',
      password: hashed,
      role: 'SUPER_ADMIN',
    },
  });

  /**
   * Four rooms; `images` / `mainImage` use the public web app paths (`public/rooms/` copies of `src/assets`).
   * Re-run seed or sync from admin with the same `/rooms/roomN.avif` pattern so the guest site resolves them.
   */
  const roomCatalog: Array<{
    name: string;
    type: 'STANDARD' | 'DELUXE' | 'FAMILY' | 'SUITE';
    price: number;
    capacity: number;
    description: string;
    images: string[];
  }> = [
    {
      name: 'Garden View 101',
      type: 'STANDARD',
      price: 2500,
      capacity: 2,
      description: 'Cozy standard room with garden outlook.',
      images: ['/rooms/room1.avif'],
    },
    {
      name: 'Deluxe Suite 201',
      type: 'DELUXE',
      price: 4500,
      capacity: 3,
      description: 'Spacious deluxe with natural light.',
      images: ['/rooms/room2.avif'],
    },
    {
      name: 'Family Room 301',
      type: 'FAMILY',
      price: 6000,
      capacity: 5,
      description: 'Ideal for families—space to spread out.',
      images: ['/rooms/room3.avif'],
    },
    {
      name: 'Tea Vista 401',
      type: 'SUITE',
      price: 7200,
      capacity: 2,
      description: 'Corner suite with tea-garden views.',
      images: ['/rooms/room4.avif'],
    },
  ];

  for (const r of roomCatalog) {
    const rm = await prisma.room.findFirst({ where: { name: r.name } });
    if (rm) {
      await prisma.room.update({
        where: { id: rm.id },
        data: {
          type: r.type,
          price: r.price,
          capacity: r.capacity,
          description: r.description,
          images: r.images,
          mainImage: r.images[0],
        },
      });
    } else {
      await prisma.room.create({
        data: {
          name: r.name,
          type: r.type,
          price: r.price,
          capacity: r.capacity,
          status: 'AVAILABLE',
          description: r.description,
          images: r.images,
          mainImage: r.images[0],
        },
      });
    }
  }

  if ((await prisma.guest.count()) === 0) {
    await prisma.guest.createMany({
      data: [
        { name: 'Demo Guest One', phone: '01700000001', email: 'guest1@example.com', nid: '1234567890', address: 'Dhaka' },
        { name: 'Demo Guest Two', phone: '01700000002', email: 'guest2@example.com', passport: 'AB1234567', address: 'Sylhet' },
      ],
    });
  }

  const room = await prisma.room.findFirst({ where: { name: 'Garden View 101' } });
  const guest = await prisma.guest.findFirst({ where: { phone: '01700000001' } });

  if (room && guest && (await prisma.booking.count()) === 0) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);
    await prisma.booking.create({
      data: {
        roomId: room.id,
        guestId: guest.id,
        staffId: admin.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: 'CONFIRMED',
        totalAmount: room.price * 2,
        notes: 'Seeded booking',
      },
    });
    await prisma.room.update({ where: { id: room.id }, data: { status: 'BOOKED' } });
  }

  /** Set menus + à la carte — rebuilt each seed run for `/restaurant`. */
  await prisma.restaurantMenu.deleteMany({});

  await prisma.restaurantMenu.createMany({
    data: [
      {
        id: 'a1000001-0000-4000-8000-000000000001',
        category: '01_SET_BREAKFAST',
        sortOrder: 1,
        name: 'Highland Sunrise Set · টি হিল প্রভাত',
        price: 620,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1493770348161-369560609357?auto=format&fit=crop&w=1200&q=80',
        description:
          'সাত রকমের টি টেইস্টিং, পরোটা বা টোস্ট, মসুর ডাল, মৌসুমি ফল, দই।\nফিল্টার কফি বা গরম চা · ডিম শেফ স্টাইলে (অর্ডারে জানান)।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000002',
        category: '01_SET_BREAKFAST',
        sortOrder: 2,
        name: 'Misty Terrace Continental · মেঘ ট্রে',
        price: 780,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
        description:
          'ক্রোইসান বা টোস্ট, জ্যাম, মাখন, হালকা স্ক্র্যাম্বলড ডিম।\nগ্রিল সসেজ বা ভেজ বিকল্প · মৌসুমি ফল · কফি বা দুধ চা।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000003',
        category: '01_SET_BREAKFAST',
        sortOrder: 3,
        name: 'Bangla Cottage Breakfast · গ্রামীণ সকাল',
        price: 520,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1546069901-ba95909a691e?auto=format&fit=crop&w=1200&q=80',
        description:
          'ভাজা খিচুড়ি বা লুচি, সবজির তরকারি, ভর্তা, ডিম।\nমিষ্টি দই বা ছানা · গরম চা।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000010',
        category: '02_SET_LUNCH',
        sortOrder: 1,
        name: 'Tea Garden Lunch Thali · বাগান থালি',
        price: 890,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1588137378718-ff6a509e731f?auto=format&fit=crop&w=1200&q=80',
        description:
          'গরম ভাত, ডাল, মাছ বা মাংস (একটি), দুই রকম সবজি, সালাদ, পাপড়।\nরসগোল্লা বা ফল · লেবু পানি।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000011',
        category: '02_SET_LUNCH',
        sortOrder: 2,
        name: 'Hill Wind Biryani Box · হিল উইন্ড বিরিয়ানি',
        price: 750,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1563379091339-03246963d96a?auto=format&fit=crop&w=1200&q=80',
        description:
          'কাচি বা চিকেন বিরিয়ানি (অর্ডারে), বোরহানি, সালাদ, আচার।\nফিরনি বা পায়েস।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000012',
        category: '02_SET_LUNCH',
        sortOrder: 3,
        name: 'Green Leaf Veg Thali · সবুজ নিরামিষ',
        price: 650,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
        description:
          'ভাত, পাঁচ রকম ভর্তা ও তরকারি, ডাল, শাক, পাপড়, দই।\nমিষ্টি দই · চা বা লেবু।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000020',
        category: '03_SET_DINNER',
        sortOrder: 1,
        name: 'Twilight Grill Set · সন্ধ্যা গ্রিল',
        price: 1450,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
        description:
          'গ্রিল চিকেন বা স্টেক (পোরশন শেফের স্টাইলে), রোস্টেড সবজি, ম্যাশ বা ফ্রাইড রাইস।\nস্যুপ বা সালাদ · ডেজার্ট · পানীয় একটি।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000021',
        category: '03_SET_DINNER',
        sortOrder: 2,
        name: 'Royal Sylhet Dinner · রাজকীয় ডিনার',
        price: 1680,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
        description:
          'কাবাব প্লাটার (মিক্স), নান বা পরোটা, কারি (মাছ/মাংস), পোলাউ।\nকাচা আমের চাটনি · মিষ্টি · গরম চা।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000022',
        category: '03_SET_DINNER',
        sortOrder: 3,
        name: 'Sreemangal Candlelight · ক্যান্ডেললাইট টেবিল ফর টু',
        price: 3200,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        description:
          'চার কোর্স শেফ মেনু (স্টার্টার, স্যুপ, মেইন, ডেজার্ট) দুই জনের জন্য।\nরিজার্ভেশন প্রয়োজন · মৌসুমে মেনু বদলাতে পারে।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000030',
        category: '04_STARTERS',
        sortOrder: 1,
        name: 'Seven-Layer Tea Flight · সাত রঙের চা',
        price: 280,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
        description: 'স্থানীয় সাত রং চায়ের টেইস্টিং ট্রে — ফটো ফ্রেন্ডলি।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000031',
        category: '04_STARTERS',
        sortOrder: 2,
        name: 'Pitha Platter · পিঠা প্ল্যাটার',
        price: 420,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1600490033905-93e6d5c6cfc5?auto=format&fit=crop&w=1200&q=80',
        description: 'চিতই, ভাপা পিঠা, নাল পিঠা — মিষ্টি ও নোনতা মিক্স (মৌসুমি)।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000032',
        category: '04_STARTERS',
        sortOrder: 3,
        name: 'Resort Kebab Trio · তিন রকম কাবাব',
        price: 550,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=80',
        description: 'চিকেন, শীত কাবাব ও শিক — মিন্ট চাটনি ও সালাদ।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000033',
        category: '04_STARTERS',
        sortOrder: 4,
        name: 'Forest Mushroom Soup · মাশরুম স্যুপ',
        price: 320,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
        description: 'ক্রিমি মাশরুম স্যুপ, গার্লিক ব্রেড স্টিক।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000040',
        category: '05_MAINS',
        sortOrder: 1,
        name: 'Bhuna Kacchi Goat · ভুনা কাচ্চি ছাগল',
        price: 520,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c21?auto=format&fit=crop&w=1200&q=80',
        description: 'মেদের কাচ্চি শেল্প, গরম রুটি বা ভাতের সাথে।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000041',
        category: '05_MAINS',
        sortOrder: 2,
        name: 'Hill River Fish Curry · টিলা মাছের ঝাল',
        price: 480,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1519708227418-c4fdccc2d175?auto=format&fit=crop&w=1200&q=80',
        description: 'দিনের মাছ, সরিষা বা দুধ ঝাল — শীতল টমেটো খচ্চর।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000042',
        category: '05_MAINS',
        sortOrder: 3,
        name: 'Clay Pot Beef Tehari · হাঁড়ি তেহারি',
        price: 450,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265948?auto=format&fit=crop&w=1200&q=80',
        description: 'মসলায় হাঁড়িতে ফোটানো বিফ তেহারি — সালাদ ও আচার।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000043',
        category: '05_MAINS',
        sortOrder: 4,
        name: 'Paneer Tikka Makhani · পনীর টিক্কা ',
        price: 420,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1567188040759-76bbd0a29666?auto=format&fit=crop&w=1200&q=80',
        description:
          'পনির টিক্কা ও মখনী গ্রেভি নিরামিষ বিকল্প — নান বা জিরা ভাতের সাথে।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000050',
        category: '06_RICE_BREAD',
        sortOrder: 1,
        name: 'Kalijira Polao · কালিজিরা পোলাউ',
        price: 220,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1603133872878-684ac608d810?auto=format&fit=crop&w=1200&q=80',
        description: 'হালকা মসলার কালিজিরা ভাত।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000051',
        category: '06_RICE_BREAD',
        sortOrder: 2,
        name: 'Tandoor Basket · তন্দুরি ঝુড়ি',
        price: 180,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1596795204327-7259960c2cb5?auto=format&fit=crop&w=1200&q=80',
        description: 'নান, রুটি, লাচ্ছা পরোটা — মিক্স।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000052',
        category: '06_RICE_BREAD',
        sortOrder: 3,
        name: 'Steamed Bashmoti · বাসমতি ভাপ',
        price: 160,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1536304573101-b8470a7cd3ba?auto=format&fit=crop&w=1200&q=80',
        description: 'সুগন্ধি বাসমতি সাদা ভাত।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000060',
        category: '07_DESSERTS',
        sortOrder: 1,
        name: 'Nirjon Mishti Tokra · রিসোর্ট মিষ্টি',
        price: 250,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80',
        description: 'রসমালাই, সন্দেশ, পায়েস — ছোট প্লেট।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000061',
        category: '07_DESSERTS',
        sortOrder: 2,
        name: 'Orange & Dark Chocolate Mousse',
        price: 320,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1578985545062-c73b593d08ad?auto=format&fit=crop&w=1200&q=80',
        description: 'মৌসুমি কমলা ও ডার্ক চকলেট।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000070',
        category: '08_TEA_COFFEE',
        sortOrder: 1,
        name: 'Sreemangal Seven-Layer Tea · পূর্ণ কাপ',
        price: 180,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
        description: 'সাত স্তরের বিখ্যাত চা — এক কাপ।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000071',
        category: '08_TEA_COFFEE',
        sortOrder: 2,
        name: 'Hand-pulled Masala Chai · মসলা চা',
        price: 90,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1571934811-8e0cb5b09599?auto=format&fit=crop&w=1200&q=80',
        description: 'দুধ চা, আদা-এলাচ।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000072',
        category: '08_TEA_COFFEE',
        sortOrder: 3,
        name: 'Filter Coffee · ফিল্টার কফি',
        price: 140,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80',
        description: 'দক্ষিণ ভারতীয় স্টাইল ফিল্টার কফি।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000080',
        category: '09_BEVERAGES',
        sortOrder: 1,
        name: 'Fresh Lemon & Mint · লেবু পুদিনা',
        price: 120,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1513558168814-1b9b742a7f76?auto=format&fit=crop&w=1200&q=80',
        description: 'টাটকা লেবু, পুদিনা, সোডা বা পানি।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000081',
        category: '09_BEVERAGES',
        sortOrder: 2,
        name: 'Seasonal Fruit Lassi · লস্সি',
        price: 160,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1572490122747-39608b8fa1be?auto=format&fit=crop&w=1200&q=80',
        description: 'আম, কাঠাল বা দই — মৌসুম অনুযায়ী।',
      },
      {
        id: 'a1000001-0000-4000-8000-000000000082',
        category: '09_BEVERAGES',
        sortOrder: 3,
        name: 'Mineral Water · পানি',
        price: 40,
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1548835820-4dacfae4ceaa?auto=format&fit=crop&w=1200&q=80',
        description: '৫০০ মিলি বোতল।',
      },
    ],
  });

  const demoMenu = await prisma.restaurantMenu.findFirst({
    where: { name: { contains: 'Tea Garden Lunch' } },
  });
  const demoRoom = await prisma.room.findFirst({ where: { name: 'Garden View 101' } });

  if (demoMenu && demoRoom && (await prisma.restaurantOrder.count()) === 0) {
    await prisma.restaurantOrder.create({
      data: {
        roomId: demoRoom.id,
        userId: admin.id,
        items: [
          {
            menuId: demoMenu.id,
            name: demoMenu.name,
            qty: 2,
            unitPrice: demoMenu.price,
          },
        ],
        totalPrice: demoMenu.price * 2,
        status: 'DELIVERED',
        notes: 'Seeded demo order',
      },
    });
  }

  const seededBooking = await prisma.booking.findFirst();
  if (seededBooking && (await prisma.payment.count()) === 0) {
    await prisma.payment.create({
      data: {
        bookingId: seededBooking.id,
        amount: seededBooking.totalAmount * 0.5,
        method: 'BKASH',
        status: 'COMPLETED',
        transactionId: 'SEED-TXN-001',
        notes: 'Advance — seed',
      },
    });
  }

  const settingKeys = [
    { key: 'site_name', value: "Nirjon Nature's Hideout", description: 'Public site title' },
    { key: 'site_name_bn', value: 'নির্জন নেচারস হাইডআউট', description: 'Public site title Bengali' },
    { key: 'contact_phone', value: '01727-135520', description: 'Front desk' },
    { key: 'contact_email', value: 'nirjonnature@gmail.com', description: 'Inquiries' },
    { key: 'contact_address', value: 'Bishamoni, Radhanagar, Sreemangal (Opposite of Bishamoni High School), Maulvi Bazar, Bangladesh', description: 'Address' },
    { key: 'tagline', value: 'Nature retreat in Sreemangal', description: 'Tagline' },
    { key: 'tagline_bn', value: 'শ্রীমঙ্গলে প্রকৃতির আশ্রয়', description: 'Tagline Bengali' },
    { key: 'aboutShort', value: 'Nature-focused resort stay with calm hospitality.', description: 'About short' },
    { key: 'aboutShort_bn', value: 'শান্তিপূর্ণ আত্থতন্ত্রিভূত রিসোর্টে স্বাগত জানাই।', description: 'About short Bengali' },
    { key: 'aboutLong', value: 'Enjoy tea gardens, fresh air, and a peaceful stay at our Sreemangal resort.\n\nWe are located in the heart of tea country — surrounded by green hills and serene nature. Our rooms offer comfort with nature views, and our restaurant serves local Sylheti dishes.', description: 'About long' },
    { key: 'aboutLong_bn', value: 'আমাদের শ্রীমঙ্গলের রিসোর্টে চা বাগান, তাজা বাতাস ও শান্তিপূর্ণ থাকা উপভোগ করুন।\n\nআমরা চা দেশের হৃদয়ে অবস্থিত — সবুজ পাহাড় ও শান্ত প্রকৃতি দ্বারা বেষ্টিত। আমাদের রুমগুলো প্রকৃতির দৃশ্য সহ আরাম প্রদান করে, এবং আমাদের রেস্তোরা স্থানীয় সিলেটি পদ পরিবেশন করে।', description: 'About long Bengali' },
  ];
  for (const s of settingKeys) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description, type: 'string' },
    });
  }

  if ((await prisma.expenseCategory.count()) === 0) {
    const categories = [
      { name: 'Staff Salary', sortOrder: 1 },
      { name: 'Food & Kitchen', sortOrder: 2 },
      { name: 'Utilities', sortOrder: 3 },
      { name: 'Maintenance', sortOrder: 4 },
      { name: 'Supplies', sortOrder: 5 },
      { name: 'Marketing', sortOrder: 6 },
      { name: 'Transport', sortOrder: 7 },
      { name: 'Rent/Tax', sortOrder: 8 },
      { name: 'Events', sortOrder: 9 },
      { name: 'Miscellaneous', sortOrder: 10 },
    ];
    await prisma.expenseCategory.createMany({ data: categories });
  }

  const demoStaffEmail = 'restaurant@resortnirjon.com';
  await prisma.user.upsert({
    where: { email: demoStaffEmail },
    update: { name: 'Demo Restaurant Staff', role: 'RESTAURANT_STAFF' },
    create: {
      email: demoStaffEmail,
      name: 'Demo Restaurant Staff',
      password: await bcrypt.hash('Staff@12345', 10),
      role: 'RESTAURANT_STAFF',
    },
  });

  const demoReceptionistEmail = 'receptionist@resortnirjon.com';
  await prisma.user.upsert({
    where: { email: demoReceptionistEmail },
    update: { name: 'Demo Receptionist', role: 'RECEPTIONIST' },
    create: {
      email: demoReceptionistEmail,
      name: 'Receptionist',
      password: await bcrypt.hash('Staff@12345', 10),
      role: 'RECEPTIONIST',
    },
  });

  const demoHousekeepingEmail = 'housekeeping@resortnirjon.com';
  await prisma.user.upsert({
    where: { email: demoHousekeepingEmail },
    update: { name: 'Demo Housekeeping', role: 'HOUSEKEEPING' },
    create: {
      email: demoHousekeepingEmail,
      name: 'Housekeeping Staff',
      password: await bcrypt.hash('Staff@12345', 10),
      role: 'HOUSEKEEPING',
    },
  });

  const demoAccountantEmail = 'accountant@resortnirjon.com';
  await prisma.user.upsert({
    where: { email: demoAccountantEmail },
    update: { name: 'Demo Accountant', role: 'ACCOUNTANT' },
    create: {
      email: demoAccountantEmail,
      name: 'Accountant',
      password: await bcrypt.hash('Staff@12345', 10),
      role: 'ACCOUNTANT',
    },
  });

  const demoManagerEmail = 'manager@resortnirjon.com';
  await prisma.user.upsert({
    where: { email: demoManagerEmail },
    update: { name: 'Demo Manager', role: 'MANAGER' },
    create: {
      email: demoManagerEmail,
      name: 'Resort Manager',
      password: await bcrypt.hash('Manager@12345', 10),
      role: 'MANAGER',
    },
  });

  if ((await prisma.siteGalleryItem.count()) === 0) {
    await prisma.siteGalleryItem.createMany({
      data: [
        {
          imageUrl: '/gallery/scene-1.jpg',
          alt: 'Resort grounds',
          category: 'Nature',
          sortOrder: 1,
          isActive: true,
        },
        {
          imageUrl: '/gallery/scene-2.jpg',
          alt: 'Tea country',
          category: 'Nature',
          sortOrder: 2,
          isActive: true,
        },
        {
          imageUrl: '/rooms/room1.avif',
          alt: 'Guest room',
          category: 'Rooms',
          sortOrder: 3,
          isActive: true,
        },
      ],
    });
  }

  /** Home “nearby explore” copy — only create if missing so admin edits survive re-seed. */
  const nearbySectionSeed = [
    {
      key: 'nearbySectionEyebrow',
      value: 'Explore · আশেপাশে',
      description: 'Public home: nearby spots section eyebrow',
    },
    {
      key: 'nearbySectionTitle',
      value: 'Nirjon Nature Hideout-এর আশেপাশে ঘুরার সেরা জায়গা',
      description: 'Public home: nearby spots main title (BN)',
    },
    {
      key: 'nearbySectionSubtitle',
      value:
        'রিসোর্টে থেকে দিনে একটু বের হলেই—জঙ্গল, টি বাগান, জলপ্রপাত আর হালকা চায়ের গন্ধ। কার্ডে ক্লিক করলে বিস্তারিত পড়তে পারবেন।',
      description: 'Public home: nearby spots subtitle',
    },
    {
      key: 'nearbySectionFootnote',
      value:
        'দূরত্ব আনুমানিক গাড়ি রুট অনুযায়ী—ট্রাফিক ও রাস্তা ভেদে বদলাতে পারে। শীতে বাইক্কা বিলে পাখির চল আরও বেশি।',
      description: 'Public home: nearby spots footnote',
    },
  ] as const;
  for (const s of nearbySectionSeed) {
    const cur = await prisma.setting.findUnique({ where: { key: s.key } });
    if (!cur) {
      await prisma.setting.create({
        data: { key: s.key, value: s.value, description: s.description, type: 'string' },
      });
    }
  }

  type NearbySeed = {
    slug: string;
    title: string;
    emoji: string;
    badge: string;
    distance: string;
    bullets: string[];
    bestFor: string;
    imageUrl: string;
    imageAlt: string;
    body: string;
    sortOrder: number;
  };

  const blogsSeed = [
    {
      slug: 'discovering-lawachara',
      title: 'Discovering Lawachara: A Jungle Escape Near Sreemangal',
      summary: 'Just a short drive from Resort Nirjon lies Lawachara National Park — a hidden rainforest where you can spot Hoolock gibbons, hike through lush trails, and experience the wild side of Sylhet.',
      content: `Lawachara National Park is one of Bangladesh's most remarkable natural treasures, located just 8-12 km from Sreemangal town in the Moulvibazar district. This semi-evergreen rainforest spans approximately 1,250 hectares and is part of the larger West Bhanugach Reserved Forest.

Established as a national park in 1996 under the Wildlife Act, Lawachara is home to the western Hoolock gibbon — Bangladesh's only wild primate. These gibbons live in small groups high in the canopy, and hearing their morning calls is an unforgettable experience. Along with gibbons, you might spot Phayre's leaf monkeys, capped langurs, and over 167 plant species.

The park offers well-maintained hiking trails perfect for nature walks. Early morning visits are best for bird watching and photographing the forest in soft light. Remember to bring sturdy shoes, water, and avoid carrying plastic into the forest.

Tips: Hire a local guide for safety, wear comfortable walking shoes, and bring a camera with good low-light performance.`,
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-dfd8ca53d7bf?auto=format&fit=crop&w=1200&q=80',
      category: 'Nature',
      authorName: "Nirjon Nature's Hideout",
      tags: ['lawachara', 'nature', 'hiking', 'wildlife', 'sreemangal'],
      sortOrder: 1,
      isActive: true,
      isFeatured: true,
    },
    {
      slug: 'tea-tour-sreemangal',
      title: 'The Ultimate Tea Tour: Exploring Sreemangal Tea Gardens',
      summary: 'Known as the tea capital of Bangladesh, Sreemangal boasts rolling green tea gardens. Discover the best spots to experience tea culture, taste the famous seven-layer tea, and capture stunning photos.',
      content: `Sreemangal is famously called the tea capital of Bangladesh, and for good reason. The entire region is surrounded by vast tea plantations stretching across rolling hills. The area produces some of the world's finest Orthodox tea, exported globally.

The most famous attraction is the "Seven-Layer Tea" (SAT Rong Cha) — a unique beverage where different layers of tea offer different flavors in one glass. You can find this at various tea stalls throughout the town, with NilKuthi being one of the most famous.

Tea garden tours are available through several estates. You can drive through the plantations, interact with tea pluckers (mostly women from local communities), and learn about the tea-making process from leaf to cup.

Best time to visit: October to March for pleasant weather. Early morning offers misty views perfect for photography. Bring sun protection and comfortable footwear for garden walks.`,
      imageUrl: 'https://images.unsplash.com/photo-1587387119725-9d3998863f18?auto=format&fit=crop&w=1200&q=80',
      category: 'Experience',
      authorName: "Nirjon Nature's Hideout",
      tags: ['tea', 'tour', 'sreemangal', 'seven-layer-tea', 'nature'],
      sortOrder: 2,
      isActive: true,
      isFeatured: true,
    },
    {
      slug: 'madhabkunda-waterfall-guide',
      title: 'Madhabkunda Waterfall: Bangladesh\'s Pride in the East',
      summary: 'Standing at 61 meters, Madhabkunda is one of Bangladesh\'s highest waterfalls. Plan your day trip to this natural wonder in Moulvibazar — tips, directions, and what to expect.',
      content: `Madhabkunda Waterfall is located in Bishamahar of Moulvibazar district, approximately 40-45 km from Sreemangal. With a height of about 61 meters (200 feet), it's one of the tallest waterfalls in Bangladesh. The water cascades down the Patharia hills and flows through the Madhabchhara stream towards the Hakaluki Haor.

The area around the waterfall is part of a larger eco-park, providing basic amenities for visitors. The rocky steps leading up to the waterfall offer great vantage points for photography, though caution is needed as rocks can be slippery.

This is a full-day trip destination. We recommend starting early morning from the resort (around 7 AM) to avoid crowds and have ample time to explore. The road conditions have improved in recent years, but some sections are still rough.

Pack lightly: Bring water, snacks, good walking shoes, and a change of clothes if you plan to wade in the natural pools. Avoid plastics and help keep this beautiful site clean.`,
      imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f1?auto=format&fit=crop&w=1200&q=80',
      category: 'Adventure',
      authorName: "Nirjon Nature's Hideout",
      tags: ['waterfall', 'madhabkunda', 'day-trip', 'nature', 'adventure'],
      sortOrder: 3,
      isActive: true,
      isFeatured: false,
    },
    {
      slug: 'birdwatching-at-baikhali',
      title: 'Birdwatching at Baikka Beel: A Sanctuary for Migratory Birds',
      summary: 'Just 25 km from Sreemangal lies Baikka Beel Wetland Sanctuary — a paradise for birdwatchers. Learn when and how to spot hundreds of migratory birds in their natural habitat.',
      content: `Baikka Beel Wetland Sanctuary is approximately 25-30 km from Sreemangal, within the Hail Haor region. Declared a permanent sanctuary in 2003, it covers over 170 hectares and is a crucial habitat for both resident and migratory waterfowl.

The sanctuary is particularly spectacular during winter (November to February) when thousands of migratory birds arrive. Species include various ducks, egrets, herons, and the rare Bengal florican. The best viewing spots are from watchtowers built for visitors.

Sunrise and sunset offer the most dramatic views, with mist floating over the water and flocks of birds in flight. Bring binoculars, a camera with a good zoom lens, and wear muted colors to avoid disturbing the birds.

Remember: Maintain silence, stay at designated viewing points, and never disturb the birds or their nests. This is a protected area — help preserve this precious ecosystem.`,
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      category: 'Wildlife',
      authorName: "Nirjon Nature's Hideout",
      tags: ['birdwatching', 'baikka-beel', 'wetland', 'migratory-birds', 'nature'],
      sortOrder: 4,
      isActive: true,
      isFeatured: false,
    },
    {
      slug: 'sreemangal-culinary-tour',
      title: 'A Culinary Journey Through Sreemangal: Local Flavors You Must Try',
      summary: 'From the famous seven-layer tea to local Bengali delicacies, Sreemangal offers a unique food scene. Discover the must-try dishes and best local eateries during your stay.',
      content: `Sreemangal is not just about tea — its culinary scene reflects the rich culture of the Sylhet region. Here's what every visitor should try:

SAT RONG CHA (Seven-Layer Tea): The iconic seven-layered tea at NilKuthi. Each layer has a different flavor — from sweet to milky to tangy. Perfect for social media photos.

PITHAs: Traditional rice cakes, especially during winter. Look forChitai Pitha (rice pancake), Bhapa Pitha (steamed), and Nal Pitha (tube-shaped).

HILL GOAT CURRY: The local mountain goat is prized for its lean meat. Bhuna Kacchi Goat is a must-try — tender meat in aromatic spices.

RICE VARIETIES: Kalo Jira Polao (black cumin rice) and steamed Bashmati are local specialties.

Where to eat: The local market near Sreemangal bus stand has excellent street food. For fine dining, Resort Nirjon's own restaurant offers both traditional Bangladeshi and Continental options.

Best times: Breakfast early at tea stalls, lunch around noon, and dinner by 8 PM. Many shops close early in the evening.`,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
      category: 'Food',
      authorName: "Nirjon Nature's Hideout",
      tags: ['food', 'tea', 'culinary', 'local', 'sreemangal'],
      sortOrder: 5,
      isActive: true,
      isFeatured: true,
    },
  ];

  for (const blog of blogsSeed) {
    const data = {
      slug: blog.slug,
      title: blog.title,
      summary: blog.summary,
      content: blog.content,
      imageUrl: blog.imageUrl,
      category: blog.category,
      authorName: blog.authorName,
      tags: blog.tags,
      sortOrder: blog.sortOrder,
      isActive: blog.isActive,
      isFeatured: blog.isFeatured,
    };
    await prisma.siteBlog.upsert({
      where: { slug: blog.slug },
      create: data,
      update: data,
    });
  }

  const nearbySpotsSeed: NearbySeed[] = [
    {
      slug: 'lawachara-national-park',
      title: 'Lawachara National Park',
      emoji: '🌳',
      badge: 'Must visit',
      distance: '~৮–১২ কিমি',
      bullets: [
        'ঘন সবুজ রেইনফরেস্ট ও হাইকিং ট্রেইল',
        'বাংলাদেশের একমাত্র বন্য প্রাইমেট — হুলক গিবন',
        'পাখি ও প্রকৃতি ফটোগ্রাফির জন্য দারুণ',
      ],
      bestFor: 'Nature walk · photography · jungle vibe',
      imageUrl:
        'https://images.unsplash.com/photo-1448375240586-dfd8ca53d7bf?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Dense tropical rainforest canopy with light through the trees',
      sortOrder: 1,
      body: `লাওয়াছড়া জাতীয় উদ্যান বাংলাদেশের মৌলভীবাজার জেলার কমলগঞ্জ উপজেলায় অবস্থিত—শ্রীমঙ্গল শহর থেকে মাত্র কয়েক কিলোমিটার দূরে। প্রায় ১,২৫০ হেক্টর এলাকা জুড়ে সেমি-এভারগ্রিন ও মিশ্র পর্ণমোচী বন; এটি বৃহত্তর পশ্চিম ভানুগাছ সংরক্ষিত বনের অংশ।

১৯৯৬ সালের ৭ জুলাই বন্যপ্রাণী আইনের অধীনে জাতীয় উদ্যান হিসেবে ঘোষিত হয়। এখানে পশ্চিমা হুলক গিবনের বাংলাদেশের অন্যতম গুরুত্বপূর্ণ আবাস — দেশের একমাত্র বন্য মানুষের নিকটাত্মীয় এই প্রাইমেটগুলো গাছের উচ্চ শাখায় জীবন কাটায়। ছোট দলে থাকা গিবন, ফেয়ারের লিফ মাঙ্কি, ক্যাপড ল্যাঙ্গুরসহ একাধিক বিপন্ন প্রাইমেটের দেখা মেলে।

প্রায় ১৬৭ প্রজাতির উদ্ভিদ, ২৪৬+ পাখি ও বিভিন্ন স্তন্যপায়ীসহ জীববৈচিত্র্য সমৃদ্ধ। নির্ধারিত ট্রেইল দিয়ে জঙ্গল ওয়াক, গাইড সহ ভ্রমণ নিরাপদ ও উপভোগ্য। ভোর বা সকালে গেলে পাখির ডাক ও বনের আলো এক অন্য রূপ দেখায়।

ভ্রমণ টিপস: জঙ্গলে প্লাস্টিক নিয়ে যাবেন না; নিরাপত্তার জন্য স্থানীয় গাইড নেওয়া ভালো; চিকন জুতা ও পানি সাথে রাখুন।`,
    },
    {
      slug: 'sreemangal-tea-gardens',
      title: 'Sreemangal Tea Gardens',
      emoji: '🍃',
      badge: 'Classic',
      distance: '৫–১৫ কিমি (ছড়িয়ে)',
      bullets: [
        'সবুজ চা বাগানের সারি',
        'কাছেই বিখ্যাত সাত রং চা',
        'আরামদায়ক ড্রাইভ ও ছবি তোলার স্পট',
      ],
      bestFor: 'Drone shots · chill drive · couple photos',
      imageUrl:
        'https://images.unsplash.com/photo-1587387119725-9d3998863f18?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Rolling green tea plantation hills',
      sortOrder: 2,
      body: `শ্রীমঙ্গলকে বলা হয় বাংলাদেশের চা রাজধানী। শহরের চারপাশে ছড়িয়ে আছে অসংখ্য চা বাগান—নীলক নীলকন্ঠ, লুকলুক টি এস্টেট, জিয়াউর টি গার্ডেনসহ বিখ্যাত নামগুলো। সবুজ টিলা, কুয়াশা ভরা সকাল আর শ্রমিকদের চা পাতা তোলার দৃশ্য—এক অনন্য অভিজ্ঞতা।

“সাত রং চা” বা সাত স্তরের চা শ্রীমঙ্গলের আইকনিক স্বাদ; নীলক চা বিভিন্ন স্তরে আলাদা আলাদা স্বাদ দেয়। বাগানের পাশ দিয়ে গাড়ি চালিয়ে যাওয়া, ছোট্ট চা কiosk-এ দাঁড়িয়ে গরম চা—সবই ধীর গতির ছুটির জন্য উপযুক্ত।

সূর্যোদয় ও সন্ধ্যায় আলো নরম থাকে—ফটোগ্রাফি ও প্রি-ওয়েডিং শ্যুটের জন্য জনপ্রিয়। বাগানের ভেতরে না ঢুকে রাস্তা থেকে দেখা শ্রদ্ধাশীল—নির্দিষ্ট বাগানে প্রবেশের অনুমতি লাগতে পারে।`,
    },
    {
      slug: 'madhabkunda-waterfall',
      title: 'Madhabkunda Waterfall',
      emoji: '💧',
      badge: 'Day trip',
      distance: '~৪০–৪৫ কিমি',
      bullets: [
        'বাংলাদেশের অন্যতম উচ্চ জলপ্রপাত (প্রায় ২০০ ফুট / ৬১ মিটার)',
        'পাথরিয়া পাহাড় থেকে নামা গঙ্গামারা ধারা',
        'দিনভর ট্রিপ ও ইকো পার্ক এলাকা',
      ],
      bestFor: 'Day trip adventure',
      imageUrl:
        'https://images.unsplash.com/photo-1432405972618-c60b0225b8f1?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Powerful waterfall in a green rocky landscape',
      sortOrder: 3,
      body: `মাধবকুণ্ড জলপ্রপাত মৌলভীবাজারের বড়লেখা উপজেলায় অবস্থিত—প্রায় ৬১ মিটার (২০০ ফুট) উচ্চতায় পড়ে এটি দেশের অন্যতম উল্লেখযোগ্য ঝর্ণা। গঙ্গামারা স্রোত পাথরিয়া পাহাড় থেকে নেমে মাধবছড়া হয়ে হাকালুকি হাওড়ের দিকে চলে যায়।

চারপাশে সবুজ বন ও পাথুরে খাদ; কাছেই মাধবকুণ্ড ইকো পার্ক ও পর্যটক সুবিধা। শ্রীমঙ্গল থেকে গাড়িতে পূর্ণ দিনের ট্রিপ হিসেবে পরিকল্পনা করুন—রাস্তা ও সময় ভেদে সময় লাগতে পারে ১.৫–২.৫ ঘণ্টার মতো এক পাশে।

ভিড় এড়াতে সপ্তাহের মাঝামাঝি দিন বেছে নিতে পারেন। পাথুরে সিঁড়িতে সতর্কতা, সাঁতার কেবল নিরাপদ স্থানে। পাশের মন্দির ও মেলার সময়কালে স্থানীয় সংস্কৃতির স্বাদ পাবেন।`,
    },
    {
      slug: 'baikka-beel-wetland',
      title: 'Baikka Beel Wetland Sanctuary',
      emoji: '🐦',
      badge: 'Wildlife',
      distance: '~২৫–৩০ কিমি',
      bullets: [
        'স্থায়ী জলাভূমি সংরক্ষণাঞ্চল — পাখি পর্যবেক্ষণের টপ স্পট',
        'শীতে অতিথি পাখির আগমন বেশি',
        'ওয়াচটাওয়ার ও লোটাস-জলাশয়ের দৃশ্য',
      ],
      bestFor: 'Bird watching · sunset view',
      imageUrl:
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Misty hills and soft morning light over landscape',
      sortOrder: 4,
      body: `বাইক্কা বিল শ্রীমঙ্গলের কাছে হাইল হাওড় অঞ্চলের একটি গুরুত্বপূর্ণ জলাভূমি সংরক্ষণাঞ্চল। ২০০৩ সালে স্থায়ী অভয়ারণ্য হিসেবে ঘোষিত হওয়ার পর থেকে মাছ ও জলজ জীববৈচিত্র্য পুনরুদ্ধারে কাজ চলেছে—প্রায় ১৭০ হেক্টরের বেশি এলাকা জুড়ে পাখি ও জলজ উদ্ভিদ সমৃদ্ধ।

শীতকালে অতিথি পাখির উপস্থিতি চমৎকার; হাজার হাজার হাঁস-ডুবুরি, ঈগল ও কুলিখানার মতো পাখির দেখা মেলে। ওয়াচটাওয়ার থেকে দূরবীনী দৃশ্য উপভোগ্য। লোটাস ও শাপলা ফোটা জলাশয়—সূর্যাস্তে আলো অসাধারণ।

পাখি দেখার সময় নীরব থাকা ও দূর থেকে দেখা সংরক্ষণের জন্য জরুরি। সকাল বা বিকেলে গেলে আলো ও পাখির চলাচল ভালো হয়।`,
    },
    {
      slug: 'btri-sreemangal',
      title: 'Bangladesh Tea Research Institute (BTRI)',
      emoji: '🌾',
      badge: 'Calm',
      distance: '~১০ কিমি',
      bullets: [
        'চা গবেষণা ও প্রদর্শনী ক্ষেত্র',
        'শান্ত পরিবেশ, সংক্ষিপ্ত পরিদর্শন',
        'চা প্রজাতি ও চাষ সম্পর্কে জানার সুযোগ',
      ],
      bestFor: 'Short visit · educational vibe',
      imageUrl:
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Lush garden path with greenery',
      sortOrder: 5,
      body: `বাংলাদেশ চা গবেষণা ইনস্টিটিউট (BTRI) শ্রীমঙ্গলে অবস্থিত—দেশের চা শিল্পের জন্য গবেষণা, উন্নত জাত উন্নয়ন ও কৃষক পরামর্শ কেন্দ্র হিসেবে কাজ করে। চা গাছের নার্সারি ও প্রদর্শনী প্লট দেখা যায়।

পরিদর্শন নীতিমালা ও সময়সূচি প্রতিষ্ঠানের অনুমতির ওপর নির্ভর করতে পারে; আগে যোগাযোগ করে নিলে ভালো। শান্ত, শিক্ষামূলক ভ্রমণ—বিশেষ করে চা সম্পর্কে জানতে আগ্রহীদের জন্য।

শ্রীমঙ্গল শহর থেকে অল্প দূরত্বে—চা বাগান এলাকার মধ্য দিয়ে যাওয়ার পথই এক অংশ অভিজ্ঞতা।`,
    },
    {
      slug: 'local-tea-shops',
      title: 'Local Tea Shops',
      emoji: '🫖',
      badge: 'Hidden gem',
      distance: 'শ্রীমঙ্গল শহর ও আশপাশ',
      bullets: [
        'সাত রং চা, লেবু চা, দুধ চা ও মালাই',
        'দ্রুত বিশ্রাম ও স্থানীয় স্বাদ',
        'ড্রাইভের ফাঁকে ছোট স্টপ',
      ],
      bestFor: 'Local flavour · quick stop between drives',
      imageUrl:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'Tea being poured into cups — warm tones',
      sortOrder: 6,
      body: `শ্রীমঙ্গলের চায়ের সংস্কৃতি রাস্তার মোড়ের দোকানেও জীবন্ত। নীলক নীলকন্সহ বিভিন্ন দোকানে “সাত রং চা”—গ্লাসে স্তরে স্তরে আলাদা রং ও স্বাদ; ছবি তোলার পাশাপাশি স্বাদও অনন্য।

লেবু চা, দুধ চা, মালাই চা ও হালকা পেঁজা—স্থানীয় পছন্দ। বাগান বা ঝর্ণা ট্রিপের আগে-পিছে এই দোকানগুলো ছোট বিশ্রামের জায়গা।

দাম ও স্বাদ দোকান ভেদে ভিন্ন হতে পারে; নগদ ও ছোট নোট সুবিধাজনক। সন্ধ্যায় কিছু দোকান বেশি ভিড় হয়—সকালে শান্ত।`,
    },
  ];

  for (const spot of nearbySpotsSeed) {
    const data = {
      title: spot.title,
      emoji: spot.emoji,
      badge: spot.badge,
      distance: spot.distance,
      bullets: spot.bullets,
      bestFor: spot.bestFor,
      imageUrl: spot.imageUrl,
      imageAlt: spot.imageAlt,
      body: spot.body,
      sortOrder: spot.sortOrder,
      isActive: true,
    };
    await prisma.siteNearbySpot.upsert({
      where: { slug: spot.slug },
      create: { slug: spot.slug, ...data },
      update: data,
    });
  }

  console.log('Seed complete. Admin:', adminEmail, '| Restaurant staff:', demoStaffEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
