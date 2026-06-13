# Email Service Setup Guide

এই project এ 4 ধরনের email automatically পাঠানো হয়:

1. **Password Reset** - যখন user password reset request করে
2. **Booking Confirmation** - যখন booking confirm হয়
3. **Payment Confirmation** - যখন payment receive হয়
4. **Check-in Reminder** - Check-in এর আগের দিন (manual trigger)

---

## 🚀 Quick Setup

### Option 1: Resend (Recommended ✅)

**Free tier:** 3,000 emails/month, 100 emails/day

1. Visit: https://resend.com
2. Sign up এবং email verify করো
3. Dashboard → API Keys → Create API Key
4. `.env` file এ add করো:

```env
EMAIL_FROM="Resort Nirjon <noreply@yourdomain.com>"
ADMIN_URL="http://localhost:8001"
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

5. Done! Server restart করো

---

### Option 2: Brevo (Sendinblue)

**Free tier:** 300 emails/day (9,000/month)

1. Visit: https://app.brevo.com
2. Sign up করো
3. Settings → SMTP & API → API Keys → Generate New API Key
4. `.env` file এ add করো:

```env
EMAIL_FROM="Resort Nirjon <noreply@yourdomain.com>"
ADMIN_URL="http://localhost:8001"
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxx
BREVO_EMAIL=your-brevo-login-email@example.com
```

---

### Option 3: Mailgun

**Free tier:** 5,000 emails/month (first 3 months)

1. Visit: https://www.mailgun.com
2. Sign up করো
3. Sending → Domains → Select domain → SMTP Credentials
4. `.env` file এ add করো:

```env
EMAIL_FROM="Resort Nirjon <noreply@yourdomain.com>"
ADMIN_URL="http://localhost:8001"
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxx
MAILGUN_SMTP_HOST=smtp.mailgun.org
MAILGUN_SMTP_USER=postmaster@yourdomain.mailgun.org
```

---

### Option 4: SendGrid

**Free tier:** 100 emails/day (3,000/month)

1. Visit: https://app.sendgrid.com
2. Sign up করো
3. Settings → API Keys → Create API Key → Full Access
4. `.env` file এ add করো:

```env
EMAIL_FROM="Resort Nirjon <noreply@yourdomain.com>"
ADMIN_URL="http://localhost:8001"
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
```

---

### Option 5: Gmail SMTP

**Free** কিন্তু limited (প্রতিদিন 500 emails)

1. Google Account → Security → 2-Step Verification enable করো
2. App Passwords generate করো: https://myaccount.google.com/apppasswords
3. `.env` file এ add করো:

```env
EMAIL_FROM="Resort Nirjon <your-email@gmail.com>"
ADMIN_URL="http://localhost:8001"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

---

## 📧 API Endpoints

### 1. Password Reset Request
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 2. Reset Password
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "token-from-email",
  "newPassword": "newPassword123"
}
```

### 3. Verify Reset Token
```bash
GET /api/auth/verify-reset-token?token=xxx
```

---

## 🧪 Testing

### Test করতে (local):

1. Email provider setup করো (যেকোনো একটা)
2. Server start করো: `npm run dev`
3. Password reset test করো:

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@resortnirjon.com"}'
```

4. Email check করো
5. Reset link click করে নতুন password set করো

---

## 🔧 Production Setup

Production এর জন্য Coolify environment variables:

```env
EMAIL_FROM=Resort Nirjon <noreply@yourdomain.com>
ADMIN_URL=https://admin.pixelsbee.com
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

---

## 🎨 Email Templates

Email templates customize করতে `apps/server/src/utils/emailService.ts` file edit করো।

সব emails Bengali + English bilingual এবং mobile-responsive.

---

## ❓ Troubleshooting

### Email পাঠাচ্ছে না?

1. `.env` file check করো - API key ঠিক আছে কিনা
2. Server logs check করো: `npm run dev`
3. Email provider dashboard check করো - API key active আছে কিনা
4. Guest email address database এ আছে কিনা check করো

### Testing locally না চাইলে:

Email logging enable করো console এ:
```typescript
// emailService.ts এ
console.log('Would send email:', options);
```

---

## 📊 Email Analytics

- **Resend:** Dashboard এ email delivery status দেখতে পারবে
- **Brevo:** Statistics → Email reports
- **Mailgun:** Analytics → Sending
- **SendGrid:** Activity Feed

---

## 💰 Cost Estimate

তোমার resort এর জন্য (প্রতিদিন ~5-10 bookings):
- Bookings: 10 emails
- Payments: 10 emails  
- Password resets: 2-3 emails
- **Total: ~25 emails/day = 750/month**

**Recommendation:** Resend free tier (3,000/month) যথেষ্ট! 🎉
