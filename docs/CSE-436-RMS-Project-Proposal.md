<div align="center">

![Metropolitan University Logo](./assets/mu-logo.png)

</div>

<br><br>

**Course Code & Title**

**CSE 436: Final Year Project**

**Department of CSE**

<br><br>

**Project Title**

**(RMS) - Resort Management System**

<br><br>

**Supervised By:**

**Abdul Wadud Shakib**

Department of CSE

<br><br>

**Submitted By:**

**Sayed MD Safiuddin**

ID: 231-112-002

Batch: 32nd (Eve)

Department of CSE

Metropolitan University, Sylhet

<br>

**Golam Kibria**

ID: 231-112-010

Batch: 32nd (Eve)

Department of CSE

Metropolitan University, Sylhet

<div style="page-break-after: always;"></div>

## Proposal for CSE 436

## Abstract

This project aims to design and develop a modern **Resort Management System (RMS)** using a full-stack web architecture. The system will provide an integrated platform for eco-resorts and boutique hotels to manage daily operations, while enabling guests to browse rooms, explore local attractions, and submit online booking requests through a public website. Key features include role-based staff administration, room and booking management, guest records, payment tracking (including bKash and bank transfer), in-house restaurant orders, staff salary management, expenditure tracking, financial reports, and CMS-driven website content. The project will follow an iterative development approach, combining agile methodologies with modern web development practices. The expected outcome is a fully functional, scalable, and user-friendly resort management solution tailored for the hospitality industry in Bangladesh, particularly in tourist destinations such as Sreemangal. This project will also serve as a practical learning experience for mastering full-stack development and building a real-world enterprise application.

<div style="page-break-after: always;"></div>

## Introduction

### Background

The hospitality and tourism sector in Bangladesh has grown significantly, with destinations such as **Sreemangal** attracting domestic and international visitors for tea gardens, nature retreats, and eco-tourism. Small and mid-sized resorts often rely on fragmented tools—paper registers, phone calls, WhatsApp messages, and spreadsheets—for bookings, payments, housekeeping, restaurant orders, and accounting. This leads to operational inefficiency, poor financial visibility, booking conflicts, and inconsistent guest communication.

A centralized **Resort Management System (RMS)** can unify marketing, reservations, staff workflows, and finance into a single digital platform. Such systems are widely used in the global hospitality industry, but affordable and localized solutions for Bangladeshi eco-resorts remain limited—especially those supporting local payment methods, bilingual websites, and multi-role staff access.

### Problem Statement

There is a need for a modern, scalable, and feature-rich resort management platform that simplifies operations for resort staff and improves the booking experience for guests. Many existing solutions are either expensive international property management systems, too generic for small resorts, or lack essential features such as local payment tracking, restaurant order management, staff payroll, and customizable public websites.

### Objectives

- To develop a fully functional Resort Management System using a modern full-stack architecture.
- To implement role-based access control (RBAC) for different staff privileges (Super Admin, Manager, Receptionist, Housekeeping, Restaurant Staff, Accountant).
- To build a public resort website with room browsing, online booking, gallery, blogs, and nearby attraction pages.
- To implement room inventory, booking workflow, guest management, and payment recording.
- To integrate restaurant menu and order management for in-house dining and room service.
- To provide expenditure, salary, and financial reporting modules for resort administration.
- To create an intuitive, responsive, and bilingual user interface (English and Bengali).
- To ensure scalability, maintainability, and production-ready deployment using Docker.

### Scope

The project will focus on developing a web-based resort management platform consisting of:

1. **Public Website** — marketing, room listing, booking form, restaurant menu, gallery, blogs, and explore pages.
2. **Admin Dashboard** — staff operations for rooms, bookings, guests, payments, restaurant, expenditures, salaries, reports, branding, and settings.
3. **Backend API** — RESTful services with authentication, validation, and PostgreSQL database.

**Limitations** in the initial version include exclusion of native mobile applications, automated online payment gateway settlement (e.g., SSLCommerz API), and live IoT-based sustainability sensor integration.

### Literature Review

#### Overview

Existing research and industry practice highlight the importance of integrated property management systems (PMS) in improving occupancy rates, revenue tracking, and guest satisfaction. Studies in hospitality technology show that digital booking systems and centralized dashboards reduce manual errors and improve staff coordination across front desk, housekeeping, and finance departments.

#### Gaps in Research

While large hotel chains use enterprise PMS platforms, small eco-resorts in developing regions often lack affordable, customizable, and locally relevant software. Many systems do not support Bangladesh-specific payment workflows (bKash, Nagad, bank transfer with proof upload), bilingual public websites, or combined resort + restaurant + payroll management in one monorepo.

#### Relevance

This project addresses that gap by building a lightweight yet powerful RMS using modern web technologies (React, Next.js, Node.js, Express, Prisma, PostgreSQL), with a focus on usability, role-based operations, and localized features for resorts in the Sylhet/Sreemangal region.

<div style="page-break-after: always;"></div>

## Features

### Public Website (Guest-Facing)

- **Homepage** with hero section, resort highlights, testimonials, and call-to-action for booking.
- **Room listing and detail pages** with images, pricing, capacity, and facilities.
- **Online booking form** with date selection, availability calendar, guest details, and payment preference (Pay Now or Pay Later).
- **Instant payment support** via bKash or bank transfer with transaction ID and payment proof upload.
- **Restaurant menu page** displaying available dishes by category.
- **Gallery page** with filterable resort photos managed from admin.
- **Nearby Explore pages** for local attractions around Sreemangal.
- **Blog section** for travel stories and resort updates.
- **Contact page** with map embed and inquiry form.
- **Bilingual support** (English and Bengali) for broader accessibility.
- **Three interchangeable website templates** selectable by Super Admin (Classic, Premium Dark, Forest/Nature theme).
- **SEO features** including sitemap, robots.txt, and structured metadata.

### Admin Dashboard (Staff-Facing)

#### Dashboard & Authentication
- Secure JWT-based login for staff users.
- Role-specific dashboard with KPIs (occupancy, revenue, pending bookings, orders, expenses).
- Notification panel for pending bookings, payments, check-ins, and housekeeping alerts.

#### User & Role Management
- Staff account creation and management (Super Admin only).
- Six roles: Super Admin, Manager, Receptionist, Housekeeping, Restaurant Staff, Accountant.
- Sidebar and API access restricted by role (RBAC).

#### Room Management
- CRUD operations for rooms (name, type, pricing, images, facilities, capacity).
- Room status workflow: Available, Booked, Cleaning, Maintenance.
- Sustainability score display for eco-resort positioning.

#### Booking Management
- View and manage all bookings with status workflow: Pending → Confirmed → Checked In → Checked Out / Cancelled.
- Manual booking creation from admin with availability calendar.
- Public website bookings synced into admin with payment metadata.
- Booking confirmation emails to guests.

#### Guest Management
- Guest profiles with phone, email, NID/passport, address, and booking history.
- Guest spend summary from completed payments.

#### Payment Management
- Record and track payments linked to bookings.
- Payment methods: Cash, bKash, Nagad, Card.
- Payment statuses: Pending, Completed, Failed, Refunded.
- Auto-creation of payment records from website bookings.
- Revenue summary and transaction history.

#### Restaurant Management
- Menu item management (name, price, category, image, availability toggle).
- Restaurant order tracking with statuses: Pending, Preparing, Ready, Delivered, Cancelled.
- Room-linked or walk-in orders.

#### Finance & Operations
- **Expenditure module** with custom expense categories and dynamic fields.
- **Pending payments** for scheduled bills and utilities.
- **Staff salary management** with monthly records and bulk payment.
- **Reports module** — revenue, occupancy, booking statistics, expenses, CSV export.

#### Content & Branding (CMS)
- Site gallery management.
- Blog post management.
- Nearby explore spot management.
- Branding settings (logo, site name, tagline, favicon).
- Resort settings (contact info, hours, payment accounts, social links, testimonials).

<div style="page-break-after: always;"></div>

## Methodology

### Research Design

The project will follow an **iterative development approach**, combining agile methodologies with modern full-stack web development practices. Development is organized as a monorepo with three applications sharing one PostgreSQL database.

### Data Collection

- User requirements gathered through analysis of resort operations, hospitality workflows, and existing manual processes.
- Sample resort data (rooms, menu items, bookings, expenses) used for development and testing.
- Feedback from supervisor and potential end users (resort staff) used to refine features.

### Data Analysis

- User feedback analyzed to improve usability of admin dashboard and public booking flow.
- Performance metrics (API response time, page load, error rates) monitored during testing.
- Financial report outputs validated against sample booking and payment data.

### Tools and Resources

| Layer | Technologies |
|-------|-------------|
| **Admin Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Recharts |
| **Public Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, GSAP |
| **Backend** | Node.js, Express.js, TypeScript, Zod validation |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Authentication** | JWT, bcrypt password hashing |
| **Email** | Nodemailer (SMTP / Resend / Brevo / SendGrid) |
| **Deployment** | Docker Compose, Coolify |
| **Version Control** | Git, GitHub |
| **Code Editor** | Visual Studio Code / Cursor |

### Timeline

| Week | Tasks |
|------|-------|
| **Week 1–2** | Project setup, monorepo structure, database schema design, Git repository, and technology stack revision. |
| **Week 3–4** | Backend API foundation, authentication, RBAC, user and room management modules. |
| **Week 5–6** | Booking and guest management, public booking API, availability calendar. |
| **Week 7–8** | Payment module, restaurant menu and orders, email notifications. |
| **Week 9–10** | Public website (Next.js): homepage, rooms, booking, restaurant, gallery, contact. |
| **Week 11** | Admin dashboard UI: bookings, payments, guests, restaurant pages. |
| **Week 12** | Expenditure, staff salary, and financial reports modules. |
| **Week 13** | CMS features: blogs, nearby explore, branding, settings, multi-template support. |
| **Week 14** | Testing, debugging, responsive design fixes, and security review. |
| **Week 15** | Docker deployment, documentation, and final refinements. |
| **Week 16** | Final documentation, presentation, and project submission preparation. |

<div style="page-break-after: always;"></div>

## Expected Outcomes

### Results

A fully functional Resort Management System with:

- Public resort website with online booking and bilingual support.
- Admin dashboard with role-based access for all resort operations.
- Integrated modules for rooms, bookings, guests, payments, restaurant, expenditures, salaries, and reports.
- CMS for gallery, blogs, branding, and website content.
- Docker-based deployment ready for production hosting.

### Impact

This project will provide a practical digital tool for eco-resorts and boutique hotels, enabling staff to manage reservations, payments, and daily operations efficiently while offering guests a modern online booking experience. It can reduce manual errors, improve financial transparency, and support better guest communication.

### Applications

The RMS can be used by:

- Eco-resorts and nature retreats in Sreemangal and Sylhet region.
- Boutique hotels and guest houses in Bangladesh.
- Small hospitality businesses needing an affordable integrated management platform.
- As a foundation for future multi-property or franchise resort management.

### Ethical Considerations

#### Ethics Statement

This project will adhere to ethical principles regarding data privacy and security. Guest personal information (phone, email, NID) and payment transaction data will be stored securely. Passwords will be hashed, API routes protected with JWT authentication, and role-based access enforced on sensitive financial operations.

#### Approval

No formal ethical approval is required for this project, as it does not involve clinical human subjects research. Guest data used during development will be simulated or anonymized for testing purposes.

## References

- Buhalis, D., & Law, R. (2008). Progress in information technology and tourism management: 20 years on and 10 years after the Internet. *Tourism Management*, 29(4), 609–623.
- Sigala, M., Christou, E., & Gretzel, U. (Eds.). (2012). *Social Media in Travel, Tourism and Hospitality*. Ashgate Publishing.
- Kasavana, M. L., & Cahill, V. J. (2007). *Managing Technology in the Hospitality Industry*. Educational Institute, AHLA.
- Prisma Documentation: https://www.prisma.io/docs
- React Documentation: https://react.dev
- Next.js Documentation: https://nextjs.org/docs
- Node.js Documentation: https://nodejs.org/en/docs/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Express.js Documentation: https://expressjs.com/
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- MDN Web Docs: https://developer.mozilla.org
