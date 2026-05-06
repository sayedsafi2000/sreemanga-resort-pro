import type { GalleryItem, MenuItem, ResortSettings, Room, Testimonial } from '@/types/resort';

/** Matches shapes returned by `/api/public` plus gallery (backend TBD). */
export const dummySettings: ResortSettings = {
  resortName: 'Nirjon Nature Escape',
  tagline: 'Peaceful environment · Tea gardens · Pure air',
  aboutShort:
    'A peaceful eco-friendly retreat surrounded by tea estates, birdsong, and misty mornings—crafted for rest, not rush.',
  aboutLong:
    'Wake to the sound of leaves in the wind, walk garden trails at dawn, and unwind by still water. Our resort blends sustainable hospitality with warm Bangladeshi care. Every stay supports local growers and keeps the landscape green for the next traveller.',
  heroImage: '/rooms/room1.avif',
  logoUrl: undefined,
  address: 'Village Road, Sreemangal, Moulvibazar 3200, Bangladesh',
  phone: '+880 1712 345 678',
  email: 'stay@nirjon-nature.bd',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11614.5!2d91.72!3d24.31!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375179be095bcdaf%3A0x20163f07d70ba025!2sSreemangal!5e0!3m2!1sen!2sbd!4v1',
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
  },
  restaurantTeaser:
    'Seasonal plates with hill herbs, slow-cooked curries, and garden-fresh breakfast spreads—served with valley views.',
};

export const dummyRooms: Room[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Garden View 101',
    type: 'STANDARD',
    price: 2500,
    capacity: 2,
    description: 'Cozy standard room with garden outlook and calm tones.',
    mainImage: '/rooms/room1.avif',
    images: ['/rooms/room1.avif'],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Deluxe Suite 201',
    type: 'DELUXE',
    price: 4500,
    capacity: 3,
    description: 'Spacious deluxe with extra comfort and natural light.',
    mainImage: '/rooms/room2.avif',
    images: ['/rooms/room2.avif'],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Family Room 301',
    type: 'FAMILY',
    price: 6000,
    capacity: 5,
    description: 'Ideal for families—space to spread out and unwind.',
    mainImage: '/rooms/room3.avif',
    images: ['/rooms/room3.avif'],
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Tea Vista 401',
    type: 'SUITE',
    price: 7200,
    capacity: 2,
    description: 'Corner suite with tea-garden views and a quiet reading nook.',
    mainImage: '/rooms/room4.avif',
    images: ['/rooms/room4.avif'],
  },
];

export const dummyGallery: GalleryItem[] = [
  { id: '1', src: '/rooms/room1.avif', alt: 'Guest room', category: 'Rooms' },
  { id: '2', src: '/rooms/room2.avif', alt: 'Deluxe space', category: 'Rooms' },
  { id: '3', src: '/rooms/room3.avif', alt: 'Family room', category: 'Rooms' },
  { id: '4', src: '/rooms/room4.avif', alt: 'Tea vista suite', category: 'Rooms' },
  { id: '5', src: '/gallery/scene-1.jpg', alt: 'Resort grounds', category: 'Nature' },
  { id: '6', src: '/gallery/scene-2.jpg', alt: 'Tea country', category: 'Nature' },
  { id: '7', src: '/gallery/scene-3.jpg', alt: 'Path and green', category: 'Garden' },
  { id: '8', src: '/gallery/scene-4.jpg', alt: 'Evening light', category: 'Nature' },
];

export const dummyMenu: MenuItem[] = [
  { id: 'm1', name: 'Seven Layer Tea & Cake', price: 350, category: 'Signatures', description: 'Local favourite pairing.', image: null, isAvailable: true },
  { id: 'm2', name: 'Grilled Rui with Herbs', price: 620, category: 'Mains', description: 'River fish, citrus, garden herbs.', image: null, isAvailable: true },
  { id: 'm3', name: 'Seasonal Vegetable Thali', price: 480, category: 'Mains', description: 'Five seasonal sides, rice, flatbread.', image: null, isAvailable: true },
  { id: 'm4', name: 'Smoked Duck Salad', price: 550, category: 'Starters', description: 'Greens, plum, light vinaigrette.', image: null, isAvailable: true },
  { id: 'm5', name: 'Jackfruit Kofta Curry', price: 420, category: 'Mains', description: 'Plant-based, creamy coconut gravy.', image: null, isAvailable: true },
  { id: 'm6', name: 'Hill Honey Parfait', price: 280, category: 'Desserts', description: 'Yogurt, granola, seasonal fruit.', image: null, isAvailable: true },
];

export const dummyTestimonials: Testimonial[] = [
  { id: 't1', quote: 'We unplugged for three days—the garden pool at sunset was unforgettable.', author: 'Nadia R.', role: 'Dhaka' },
  { id: 't2', quote: 'Quiet rooms, kind staff, and food that tastes like home but elevated.', author: 'Farhan K.', role: 'Chittagong' },
  { id: 't3', quote: 'Perfect base for Lawachara and tea estate walks. Already planning a return.', author: 'Samira T.', role: 'Sylhet' },
];
