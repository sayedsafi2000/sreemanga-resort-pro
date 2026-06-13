import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Email provider type
type EmailProvider = 'resend' | 'brevo' | 'mailgun' | 'sendgrid' | 'smtp';

class EmailService {
  private provider: EmailProvider;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.provider = this.detectProvider();
    this.initializeTransporter();
  }

  private detectProvider(): EmailProvider {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.BREVO_API_KEY) return 'brevo';
    if (process.env.MAILGUN_API_KEY) return 'mailgun';
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    if (process.env.SMTP_HOST) return 'smtp';
    return 'smtp'; // fallback
  }

  private initializeTransporter() {
    switch (this.provider) {
      case 'resend':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY,
          },
        });
        break;

      case 'brevo':
        this.transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_EMAIL || '',
            pass: process.env.BREVO_API_KEY || '',
          },
        });
        break;

      case 'mailgun':
        this.transporter = nodemailer.createTransport({
          host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_SMTP_USER || '',
            pass: process.env.MAILGUN_API_KEY || '',
          },
        });
        break;

      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY || '',
          },
        });
        break;

      case 'smtp':
      default:
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
              }
            : undefined,
        });
        break;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const from = process.env.EMAIL_FROM || 'noreply@resortnirjon.com';

    try {
      await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`Email sent via ${this.provider}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email via ${this.provider}:`, error);
      return false;
    }
  }

  // Password Reset Email
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 Resort Nirjon</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>আপনি আপনার password reset করার জন্য request করেছেন।</p>
              <p>নিচের button এ click করে নতুন password set করুন:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>অথবা এই link টি copy করুন:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p><strong>Note:</strong> এই link টি 1 ঘন্টার জন্য valid থাকবে।</p>
              <p>যদি আপনি এই request করেননি, তাহলে এই email টি ignore করুন।</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Resort Nirjon. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Resort Nirjon',
      html,
      text: `Password reset করতে এই link এ যান: ${resetUrl}\n\nএই link টি 1 ঘন্টার জন্য valid।`,
    });
  }

  // Booking Confirmation Email
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
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; }
            .total { font-size: 18px; color: #10b981; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>প্রিয় ${booking.guestName},</h2>
              <p>আপনার booking confirm হয়েছে! 🎉</p>
              <div class="booking-details">
                <h3>Booking Details:</h3>
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span>${booking.bookingId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Room:</span>
                  <span>${booking.roomName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-in:</span>
                  <span>${booking.checkInDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-out:</span>
                  <span>${booking.checkOutDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Guests:</span>
                  <span>${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label total">Total Amount:</span>
                  <span class="total">৳${booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <p>আমরা আপনার আগমনের জন্য অপেক্ষা করছি। কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।</p>
              <p><strong>Check-in Time:</strong> 2:00 PM<br>
              <strong>Check-out Time:</strong> 12:00 PM</p>
            </div>
            <div class="footer">
              <p>📞 Contact: +880-XXX-XXXXXX | 📧 info@resortnirjon.com</p>
              <p>© ${new Date().getFullYear()} Resort Nirjon. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Booking Confirmation - ${booking.bookingId} - Resort Nirjon`,
      html,
      text: `Booking Confirmed!\n\nBooking ID: ${booking.bookingId}\nRoom: ${booking.roomName}\nCheck-in: ${booking.checkInDate}\nCheck-out: ${booking.checkOutDate}\nTotal: ৳${booking.totalAmount}\n\nThank you for choosing Resort Nirjon!`,
    });
  }

  // Payment Confirmation Email
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
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .payment-details { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .amount { font-size: 24px; color: #10b981; font-weight: bold; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Payment Received</h1>
            </div>
            <div class="content">
              <h2>প্রিয় ${payment.guestName},</h2>
              <p>আপনার payment সফলভাবে receive করা হয়েছে।</p>
              <div class="amount">৳${payment.amount.toLocaleString()}</div>
              <div class="payment-details">
                <h3>Payment Details:</h3>
                <div class="detail-row">
                  <span>Booking ID:</span>
                  <span>${payment.bookingId}</span>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span>৳${payment.amount.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span>Method:</span>
                  <span>${payment.method}</span>
                </div>
                ${payment.transactionId ? `
                <div class="detail-row">
                  <span>Transaction ID:</span>
                  <span>${payment.transactionId}</span>
                </div>
                ` : ''}
              </div>
              <p>ধন্যবাদ আপনার payment এর জন্য। আপনার booking এখন confirmed।</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Resort Nirjon. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Payment Confirmation - ${payment.bookingId} - Resort Nirjon`,
      html,
      text: `Payment Received!\n\nBooking ID: ${payment.bookingId}\nAmount: ৳${payment.amount}\nMethod: ${payment.method}\n\nThank you!`,
    });
  }

  // Check-in Reminder Email
  async sendCheckInReminderEmail(
    email: string,
    reminder: {
      guestName: string;
      roomName: string;
      checkInDate: string;
      bookingId: string;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .reminder-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 Check-in Reminder</h1>
            </div>
            <div class="content">
              <h2>প্রিয় ${reminder.guestName},</h2>
              <div class="reminder-box">
                <p><strong>আগামীকাল আপনার check-in!</strong></p>
                <p>📅 Date: ${reminder.checkInDate}<br>
                🏠 Room: ${reminder.roomName}<br>
                🆔 Booking ID: ${reminder.bookingId}</p>
              </div>
              <p>Check-in time: 2:00 PM থেকে</p>
              <p>আমরা আপনার আগমনের জন্য প্রস্তুত!</p>
              <p><strong>আনতে ভুলবেন না:</strong></p>
              <ul>
                <li>Valid ID (NID/Passport)</li>
                <li>Booking confirmation</li>
              </ul>
            </div>
            <div class="footer">
              <p>📞 Contact: +880-XXX-XXXXXX</p>
              <p>© ${new Date().getFullYear()} Resort Nirjon. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Check-in Tomorrow - ${reminder.bookingId} - Resort Nirjon`,
      html,
      text: `Check-in Reminder!\n\nDate: ${reminder.checkInDate}\nRoom: ${reminder.roomName}\nBooking: ${reminder.bookingId}\n\nSee you tomorrow!`,
    });
  }
}

export const emailService = new EmailService();
