# CSE 436: Final Year Project — Resort Management System (RMS)

> **Note:** This Markdown file is a source copy. The formatted PDF is generated from `CSE-436-RMS-Project-Proposal.html` to match the official EduNest proposal layout.

---

**Course Code & Title**

CSE 436: Final Year Project

Department of CSE

**Project Title**

(RMS) - Resort Management System

**Supervised By:**

Abdul Wadud Shakib

Department of CSE

**Submitted By:**

| Sayed MD Safiuddin | Golam Kibria |
|---|---|
| ID: 231-112-002 | ID: 231-112-010 |
| Batch: 32nd (Eve) | Batch: 32nd (Eve) |
| Department of CSE | Department of CSE |
| Metropolitan University, Sylhet | Metropolitan University, Sylhet |

---

## Proposal for CSE 436

### Abstract

This project aims to design and develop a modern Resort Management System (RMS) using a full-stack web architecture. The RMS will provide an integrated platform for eco-resorts and boutique hotels to manage daily operations, while enabling guests to browse rooms, explore local attractions, and submit online booking requests through a public website. Key features include role-based staff administration, room and booking management, guest records, payment tracking (including bKash and bank transfer), in-house restaurant orders, staff salary management, expenditure tracking, financial reports, and CMS-driven website content. The project will follow an iterative development approach, combining agile methodologies with modern web development practices. The expected outcome is a fully functional, scalable, and user-friendly resort management solution tailored for the hospitality industry in Bangladesh, particularly in tourist destinations such as Sreemangal. This project will also serve as a practical learning experience for mastering full-stack development and building a real-world enterprise application.

---

## Introduction

### Background

The hospitality and tourism sector in Bangladesh has grown significantly, with destinations such as Sreemangal attracting domestic and international visitors for tea gardens, nature retreats, and eco-tourism. Small and mid-sized resorts often rely on fragmented tools—paper registers, phone calls, WhatsApp messages, and spreadsheets—for bookings, payments, housekeeping, restaurant orders, and accounting. This leads to operational inefficiency, poor financial visibility, booking conflicts, and inconsistent guest communication.

A centralized Resort Management System (RMS) can unify marketing, reservations, staff workflows, and finance into a single digital platform. Such systems are widely used in the global hospitality industry, but affordable and localized solutions for Bangladeshi eco-resorts remain limited—especially those supporting local payment methods, bilingual websites, and multi-role staff access.

### Problem Statement

There is a need for a modern, scalable, and feature-rich resort management platform that simplifies operations for resort staff and improves the booking experience for guests. Many existing solutions are either expensive international property management systems, too generic for small resorts, or lack essential features such as local payment tracking, restaurant order management, staff payroll, and customizable public websites.

### Objectives

- To develop a fully functional Resort Management System using a modern full-stack architecture.
- To implement user management, room inventory, booking workflow, and guest record features.
- To integrate payment tracking for local methods such as bKash, Nagad, and bank transfer.
- To build a public resort website with online booking, gallery, blogs, and nearby attraction pages.
- To create an intuitive and responsive admin dashboard with role-based access control.
- To ensure scalability and maintainability of the application.

### Scope

The project will focus on developing a web-based resort management platform that supports room management, booking processing, payment recording, restaurant orders, expenditure tracking, and staff salary management. Limitations include the exclusion of native mobile app development and automated online payment gateway integration in the initial version.

### Literature Review

#### Overview

Existing research highlights the importance of property management systems in improving occupancy rates, revenue tracking, and guest satisfaction. Studies have shown that integrated digital platforms can lead to increased operational efficiency and better staff coordination across front desk, housekeeping, and finance departments.

#### Gaps in Research

While existing platforms offer many features, there is a need for more streamlined and affordable solutions that cater to the evolving needs of small eco-resorts in developing regions. This project aims to address the gap by providing a lightweight yet powerful RMS using modern web technologies, with a focus on ease of use and localized features.

#### Relevance

This project builds upon existing research by applying modern web development practices to create a practical and efficient resort management system. It deviates by focusing on a specific technology stack and a user-centric design approach tailored for resorts in the Sylhet/Sreemangal region.

---

## Features

### Public Website

- A welcoming homepage designed to introduce the resort and attract new guests.
- A prominent banner with resort tagline and clear call-to-action buttons (Book Now, Explore Rooms).
- Room listing and detail pages with images, pricing, capacity, and facilities fetched dynamically from the backend.
- Online booking form with availability calendar, guest details, and payment preference (Pay Now or Pay Later).
- Instant payment support via bKash or bank transfer with transaction ID and payment proof upload.
- Restaurant menu page displaying available dishes by category.
- Gallery page with filterable resort photos managed from admin.
- Nearby Explore pages for local attractions around Sreemangal.
- Blog section for travel stories and resort updates.
- Contact page with map embed and bilingual support (English and Bengali).

### User Management

- Staff login and authentication using JWT.
- Role-based access control (RBAC) for different user privileges (Super Admin, Manager, Receptionist, Housekeeping, Restaurant Staff, Accountant).
- Staff profile and account management.

### Room Management

- Room creation and editing with images, pricing, and facilities.
- Room status workflow: Available, Booked, Cleaning, Maintenance.
- Room availability calendar for booking conflict prevention.

### Booking Management

- Online and manual booking creation.
- Booking status workflow: Pending, Confirmed, Checked In, Checked Out, Cancelled.
- Booking confirmation emails to guests.

### Payment Integration

- Payment recording linked to bookings with methods: Cash, bKash, Nagad, Card.
- Auto-creation of payment records from website bookings.
- Payment status tracking: Pending, Completed, Failed, Refunded.

### Restaurant & Finance

- Restaurant menu management and order tracking with status workflow.
- Expenditure tracking with custom categories and dynamic fields.
- Staff salary management with monthly records and bulk payment.
- Financial reports with revenue, occupancy, and expense analytics plus CSV export.

---

## Methodology

### Research Design

The project will follow an iterative development approach, combining agile methodologies with modern web development practices.

### Data Collection

- User requirements will be gathered through online research and feedback from potential users (resort staff and guests).
- Resort data and user data will be simulated for testing purposes.

### Data Analysis

- User feedback will be analyzed to refine the application's features and usability.
- Performance metrics (e.g., load times, error rates) will be monitored to optimize the application.

### Tools and Resources

- Admin Frontend: React.js, Vite, Tailwind CSS.
- Public Frontend: Next.js, Tailwind CSS.
- Backend: Node.js, Express.js, JWT for authentication.
- Database: PostgreSQL, Prisma ORM.
- Deployment: Docker Compose, Coolify, or Vercel.
- Version control: Git for version control.
- Code Editor: Visual Studio Code.

### Timeline

**Week 1-2:** Revising full-stack fundamentals and project setup. Focus on JavaScript, React.js, Node.js, Express.js, and PostgreSQL basics. Set up the project structure and version control with Git.

**Week 3-4:** Development of user management features. Implement staff login, authentication, and role-based access control (RBAC).

**Week 5-6:** Development of room and booking management features. Create functionalities for room creation, editing, booking, and availability calendar.

**Week 7-8:** Implementation of payment and guest management features. Allow staff to record payments and manage guest profiles linked to bookings.

**Week 9-10:** Development of restaurant and public website features. Implement menu management, order tracking, and guest-facing booking pages.

**Week 11:** Integration of expenditure and salary modules. Implement expense categories, pending payments, and staff salary tracking.

**Week 12-13:** Development of reports and CMS features. Implement financial reports, gallery, blogs, branding, and settings management.

**Week 14:** Testing and debugging. Conduct unit tests, user testing, and fix any identified issues.

**Week 15:** Deployment and final touches. Deploy the application using Docker Compose and make final adjustments based on feedback.

**Week 16:** Documentation and presentation preparation.

---

## Expected Outcomes

### Results

A fully functional Resort Management System with user management, room management, booking management, payment tracking, restaurant orders, expenditure tracking, and financial reporting capabilities.

### Impact

This project will provide a valuable tool for eco-resorts and boutique hotels, enabling staff to manage reservations, payments, and daily operations effectively and guests to access a modern online booking experience.

### Applications

The RMS can be used by eco-resorts, boutique hotels, and guest houses in Bangladesh to manage hospitality operations and deliver online booking services.

## Ethical Considerations

### Ethics Statement

This project will adhere to ethical principles regarding data privacy and security. User data will be protected, and payment information will be handled securely.

### Approval

No formal ethical approval is required for this project, as it does not involve human subjects or sensitive data.

## References

- Buhalis, D., & Law, R. (2008). Progress in information technology and tourism management. *Tourism Management*, 29(4), 609–623.
- Sigala, M., Christou, E., & Gretzel, U. (Eds.). (2012). *Social Media in Travel, Tourism and Hospitality*. Ashgate Publishing.
- Kasavana, M. L., & Cahill, V. J. (2007). *Managing Technology in the Hospitality Industry*. Educational Institute, AHLA.
- S. A. Bafna, P. D. Dutonde, S. S. Mamidwar, M. S. Korvate & D. Shirbhare. (2022). Review on study and usage of MERN stack. *International Journal for Research in Applied Science & Engineering Technology*, 10(II).
- Prisma Documentation: https://www.prisma.io/docs
- React.js Documentation: https://react.dev
- Next.js Documentation: https://nextjs.org/docs
- Node.js Documentation: https://nodejs.org/en/docs/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- MDN Web Docs: https://developer.mozilla.org
