import { Router } from 'express';
import {
  getPublicRooms,
  getPublicRoom,
  checkRoomAvailability,
  getAvailabilityCalendar,
  getPublicSettings,
  getPublicMenu,
  createPublicBooking,
  sendOtp,
  verifyOtp,
} from '../controllers/publicController';
import { getPublicGallery } from '../controllers/galleryController';
import { getPublicNearbyExplore, getPublicNearbySpotBySlug } from '../controllers/nearbySpotsController';
import { getPublicBlogs, getPublicBlogBySlug } from '../controllers/blogController';
import { getCheckoutStatus } from '../controllers/stripeController';
import {
  publicListProducts,
  publicGetProduct,
  publicCreateBooking,
  checkAvailability as dayLongAvailability,
} from '../controllers/dayLongController';
import { validateVoucher, listVouchersForEmail } from '../controllers/voucherController';

const router = Router();

router.get('/rooms', getPublicRooms);
router.get('/rooms/availability', checkRoomAvailability);
router.get('/rooms/availability-calendar', getAvailabilityCalendar);
router.get('/rooms/:id', getPublicRoom);
router.get('/settings', getPublicSettings);
router.get('/menu', getPublicMenu);
router.get('/gallery', getPublicGallery);
router.get('/nearby-explore', getPublicNearbyExplore);
router.get('/nearby-spots/:slug', getPublicNearbySpotBySlug);
router.get('/blogs', getPublicBlogs);
router.get('/blogs/:slug', getPublicBlogBySlug);
router.post('/bookings', createPublicBooking);
router.get('/day-long/products', publicListProducts);
router.get('/day-long/products/:id', publicGetProduct);
router.get('/day-long/availability', dayLongAvailability);
router.post('/day-long/bookings', publicCreateBooking);
router.post('/vouchers/validate', validateVoucher);
router.post('/vouchers/for-email', listVouchersForEmail);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.get('/stripe/session/:id', getCheckoutStatus);

export default router;
