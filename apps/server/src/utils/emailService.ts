import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// ── Shared brand constants ─────────────────────────────────────────────────
const BRAND_NAME   = process.env.RESORT_NAME       || 'Pina Vista';
const BRAND_COLOR  = '#0a1b0c'; // dark forest green
const ACCENT_COLOR = '#c8920c'; // golden amber
const EMAIL_FROM   = process.env.EMAIL_FROM        || `"${BRAND_NAME}" <${process.env.SMTP_USER || 'noreply@pinavista.com'}>`;
const YEAR         = new Date().getFullYear();

// ── Shared HTML wrapper ────────────────────────────────────────────────────
function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f1;font-family:'Segoe UI',Arial,sans-serif;color:#1a2e1b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f1;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(10,27,12,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:32px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${ACCENT_COLOR};font-weight:600;">Nature Resort</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">${BRAND_NAME}</h1>
          </td>
        </tr>

        <!-- Body -->
        ${body}

        <!-- Footer -->
        <tr>
          <td style="background:#0d1e0e;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#4a6e4a;">
              📍 Sreemangal, Sylhet, Bangladesh &nbsp;|&nbsp; 📞 +880-XXX-XXXXXX
            </p>
            <p style="margin:0;font-size:11px;color:#3a5a3a;">
              © ${YEAR} ${BRAND_NAME}. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Section helpers ────────────────────────────────────────────────────────
function bodyPad(content: string): string {
  return `<tr><td style="padding:36px 40px;">${content}</td></tr>`;
}

function detailTable(rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#4a6e4a;white-space:nowrap;border-bottom:1px solid #e8f0e8;">${label}</td>
      <td style="padding:10px 14px;font-size:13px;color:#1a2e1b;border-bottom:1px solid #e8f0e8;">${value}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5faf5;border-radius:8px;border:1px solid #d4e8d4;overflow:hidden;margin:20px 0;">${cells}</table>`;
}

function accentButton(label: string, href: string): string {
  return `<p style="text-align:center;margin:28px 0 0;">
    <a href="${href}" style="display:inline-block;background:${ACCENT_COLOR};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 36px;border-radius:6px;letter-spacing:0.5px;">${label}</a>
  </p>`;
}


// ── Email Service class ────────────────────────────────────────────────────

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
        tls: { rejectUnauthorized: false },
      });
    } else if (process.env.RESEND_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com', port: 465, secure: true,
        auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
      });
    } else if (process.env.BREVO_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com', port: 587, secure: false,
        auth: { user: process.env.BREVO_EMAIL || '', pass: process.env.BREVO_API_KEY },
      });
    } else {
      console.warn('[EmailService] No SMTP config found. Emails will not be sent.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('[EmailService] Transporter not initialized');
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[EmailService] Sent: "${options.subject}" → ${options.to}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Send failed:', error);
      return false;
    }
  }

  // ── 1. OTP Email ─────────────────────────────────────────────────────────
  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Booking Verification</p>
      <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0a1b0c;">Verify Your Email</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Use the code below to verify your email and complete your booking request.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <div style="display:inline-block;background:#0a1b0c;border-radius:10px;padding:20px 40px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;color:${ACCENT_COLOR};text-transform:uppercase;">Your OTP</p>
          <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#ffffff;font-family:'Courier New',monospace;">${otp}</p>
        </div>
      </div>

      <p style="margin:20px 0 0;font-size:13px;color:#6a8e6a;text-align:center;line-height:1.6;">
        ⏱ This code expires in <strong>5 minutes</strong>.<br>
        Do not share this code with anyone.
      </p>
    `));

    return this.sendEmail({
      to: email,
      subject: `${otp} is your ${BRAND_NAME} booking OTP`,
      html,
      text: `Your ${BRAND_NAME} booking OTP is: ${otp}\n\nValid for 5 minutes. Do not share this code.`,
    });
  }

  // ── 2. Booking Confirmation Email ─────────────────────────────────────────
  async sendBookingConfirmationEmail(
    email: string,
    booking: {
      bookingId: string;
      guestName: string;
      roomName: string;
      checkInDate: string;
      checkOutDate: string;
      totalAmount: number;
      adults: number;
      children: number;
    }
  ): Promise<boolean> {
    const guestCount = `${booking.adults} Adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} Child${booking.children > 1 ? 'ren' : ''}` : ''}`;

    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Booking Confirmed</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">Your stay is confirmed! 🎉</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Dear <strong>${booking.guestName}</strong>, we are thrilled to welcome you to ${BRAND_NAME}.
        Here are your booking details:
      </p>

      ${detailTable([
        ['Booking ID',  booking.bookingId],
        ['Room',        booking.roomName],
        ['Check-in',    `${booking.checkInDate} &nbsp; (from 2:00 PM)`],
        ['Check-out',   `${booking.checkOutDate} &nbsp; (by 12:00 PM)`],
        ['Guests',      guestCount],
        ['Total',       `৳${booking.totalAmount.toLocaleString()}`],
      ])}

      <div style="background:#f5faf5;border-left:4px solid ${ACCENT_COLOR};border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#3a5a3a;line-height:1.7;">
          📋 Please bring a valid <strong>NID / Passport</strong> at check-in.<br>
          📞 For any queries, contact us at our front desk.
        </p>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:#3a5a3a;line-height:1.7;">
        We look forward to providing you with an unforgettable nature experience.<br>
        <strong style="color:#0a1b0c;">— The ${BRAND_NAME} Team</strong>
      </p>
    `));

    return this.sendEmail({
      to: email,
      subject: `Booking Confirmed ✓ — ${booking.bookingId} | ${BRAND_NAME}`,
      html,
      text: `Booking Confirmed!\n\nID: ${booking.bookingId}\nRoom: ${booking.roomName}\nCheck-in: ${booking.checkInDate}\nCheck-out: ${booking.checkOutDate}\nGuests: ${guestCount}\nTotal: ৳${booking.totalAmount}\n\nWe look forward to welcoming you!`,
    });
  }

  // ── 3. Booking Pending Acknowledgment ─────────────────────────────────────
  async sendBookingPendingEmail(
    email: string,
    booking: {
      bookingId: string;
      guestName: string;
      roomName: string;
      checkInDate: string;
      checkOutDate: string;
      totalAmount: number;
    }
  ): Promise<boolean> {
    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Request Received</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">We've got your booking request</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Dear <strong>${booking.guestName}</strong>, thank you for choosing ${BRAND_NAME}!
        Your booking is currently <strong>pending review</strong>. We will confirm availability and contact you shortly.
      </p>

      ${detailTable([
        ['Booking ID',  booking.bookingId],
        ['Room',        booking.roomName],
        ['Check-in',    booking.checkInDate],
        ['Check-out',   booking.checkOutDate],
        ['Total',       `৳${booking.totalAmount.toLocaleString()}`],
        ['Status',      '⏳ Pending Confirmation'],
      ])}

      <div style="background:#fffbf0;border-left:4px solid ${ACCENT_COLOR};border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#6a5a2a;line-height:1.7;">
          ⏱ We typically confirm bookings within <strong>1 business day</strong>.<br>
          You will receive another email once your booking is confirmed.
        </p>
      </div>
    `));

    return this.sendEmail({
      to: email,
      subject: `Booking Request Received — ${booking.bookingId} | ${BRAND_NAME}`,
      html,
      text: `Dear ${booking.guestName},\n\nYour booking request (ID: ${booking.bookingId}) has been received and is pending confirmation.\n\nRoom: ${booking.roomName}\nCheck-in: ${booking.checkInDate}\nCheck-out: ${booking.checkOutDate}\n\nWe will contact you shortly.`,
    });
  }

  // ── 4. Payment Confirmation Email ─────────────────────────────────────────
  async sendPaymentConfirmationEmail(
    email: string,
    payment: {
      bookingId: string;
      guestName: string;
      amount: number;
      method: string;
      transactionId?: string;
    }
  ): Promise<boolean> {
    const rows: [string, string][] = [
      ['Booking ID', payment.bookingId],
      ['Amount',     `৳${payment.amount.toLocaleString()}`],
      ['Method',     payment.method],
    ];
    if (payment.transactionId) rows.push(['Transaction ID', payment.transactionId]);

    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Payment Received</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">Payment confirmed 💚</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Dear <strong>${payment.guestName}</strong>, we have successfully received your payment.
      </p>

      <div style="text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#4a6e4a;text-transform:uppercase;letter-spacing:2px;">Amount Paid</p>
        <p style="margin:0;font-size:42px;font-weight:800;color:${ACCENT_COLOR};">৳${payment.amount.toLocaleString()}</p>
      </div>

      ${detailTable(rows)}

      <p style="margin:20px 0 0;font-size:13px;color:#6a8e6a;line-height:1.6;">
        Your booking is now fully settled. See you at ${BRAND_NAME}!
      </p>
    `));

    return this.sendEmail({
      to: email,
      subject: `Payment Confirmed — ৳${payment.amount.toLocaleString()} | ${BRAND_NAME}`,
      html,
      text: `Payment Received!\n\nBooking ID: ${payment.bookingId}\nAmount: ৳${payment.amount}\nMethod: ${payment.method}${payment.transactionId ? `\nTransaction: ${payment.transactionId}` : ''}\n\nThank you!`,
    });
  }

  // ── 5. Check-in Reminder Email ────────────────────────────────────────────
  async sendCheckInReminderEmail(
    email: string,
    reminder: {
      guestName: string;
      roomName: string;
      checkInDate: string;
      bookingId: string;
    }
  ): Promise<boolean> {
    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Reminder</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">Your check-in is tomorrow! 🌿</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Dear <strong>${reminder.guestName}</strong>, we are excited to welcome you tomorrow.
        Everything is being prepared for your arrival.
      </p>

      ${detailTable([
        ['Check-in Date', reminder.checkInDate],
        ['Room',          reminder.roomName],
        ['Booking ID',    reminder.bookingId],
        ['Check-in Time', 'From 2:00 PM'],
      ])}

      <div style="background:#f5faf5;border-left:4px solid ${ACCENT_COLOR};border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0a1b0c;">Please bring:</p>
        <ul style="margin:4px 0 0;padding-left:18px;font-size:13px;color:#3a5a3a;line-height:1.8;">
          <li>Valid National ID (NID) or Passport</li>
          <li>Booking confirmation (this email)</li>
        </ul>
      </div>

      <p style="margin:20px 0 0;font-size:14px;color:#3a5a3a;line-height:1.7;">
        We look forward to seeing you at ${BRAND_NAME}!<br>
        <strong style="color:#0a1b0c;">— The ${BRAND_NAME} Team</strong>
      </p>
    `));

    return this.sendEmail({
      to: email,
      subject: `See you tomorrow! Check-in Reminder — ${BRAND_NAME}`,
      html,
      text: `Check-in Reminder!\n\nDear ${reminder.guestName},\nYour check-in at ${BRAND_NAME} is tomorrow (${reminder.checkInDate}).\nRoom: ${reminder.roomName}\nBooking: ${reminder.bookingId}\nCheck-in from 2:00 PM\n\nPlease bring your NID/Passport.`,
    });
  }

  // ── 6. Password Reset Email ───────────────────────────────────────────────
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Security</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">Password Reset Request</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        We received a request to reset your password for the <strong>${BRAND_NAME} Admin Panel</strong>.
        Click the button below to set a new password.
      </p>

      ${accentButton('Reset My Password', resetUrl)}

      <p style="margin:20px 0 0;font-size:12px;color:#6a8e6a;line-height:1.6;text-align:center;">
        Or copy this link into your browser:<br>
        <span style="color:#4a6e4a;word-break:break-all;">${resetUrl}</span>
      </p>

      <div style="background:#fff8f8;border-left:4px solid #e53e3e;border-radius:0 8px 8px 0;padding:12px 16px;margin:24px 0 0;">
        <p style="margin:0;font-size:12px;color:#c53030;line-height:1.6;">
          ⚠️ This link expires in <strong>1 hour</strong>. If you did not request this, please ignore this email — your account is safe.
        </p>
      </div>
    `));

    return this.sendEmail({
      to: email,
      subject: `Reset your password — ${BRAND_NAME} Admin`,
      html,
      text: `Reset your ${BRAND_NAME} admin password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    });
  }

  // ── 7. Profit Distribution Email ──────────────────────────────────────────
  async sendProfitDistributionEmail(
    email: string,
    payout: {
      shareholderName: string;
      periodLabel: string;
      amount: number;
      paidDate?: string;
    }
  ): Promise<boolean> {
    const rows: [string, string][] = [
      ['Period', payout.periodLabel],
      ['Amount', `৳${payout.amount.toLocaleString()}`],
    ];
    if (payout.paidDate) rows.push(['Paid On', payout.paidDate]);

    const html = wrap(bodyPad(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4a6e4a;letter-spacing:2px;text-transform:uppercase;">Profit Distribution</p>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1b0c;">Your profit share has been paid 💚</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#3a5a3a;line-height:1.7;">
        Dear <strong>${payout.shareholderName}</strong>, your profit distribution for
        <strong>${payout.periodLabel}</strong> has been processed.
      </p>

      <div style="text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#4a6e4a;text-transform:uppercase;letter-spacing:2px;">Amount</p>
        <p style="margin:0;font-size:42px;font-weight:800;color:${ACCENT_COLOR};">৳${payout.amount.toLocaleString()}</p>
      </div>

      ${detailTable(rows)}

      <p style="margin:20px 0 0;font-size:13px;color:#6a8e6a;line-height:1.6;">
        Log in to your ${BRAND_NAME} shareholder portal to view your full distribution history.
      </p>
    `));

    return this.sendEmail({
      to: email,
      subject: `Profit Distribution — ৳${payout.amount.toLocaleString()} | ${BRAND_NAME}`,
      html,
      text: `Profit Distribution Paid\n\nPeriod: ${payout.periodLabel}\nAmount: ৳${payout.amount}${payout.paidDate ? `\nPaid On: ${payout.paidDate}` : ''}\n\nThank you for investing in ${BRAND_NAME}.`,
    });
  }
}

export const emailService = new EmailService();
