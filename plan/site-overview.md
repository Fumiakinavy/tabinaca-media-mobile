# Site Overview: Gappy Tabinaka Media (Web)

## Purpose
- A travel media + discovery web app focused on Shibuya, Tokyo.
- Helps users find authentic Japanese experiences and nearby spots, often with coupons/deals.
- Provides AI chat guidance, curated experiences, and articles.

## Primary Navigation & IA
- Header navigation: Home (/), Chat (/chat), Experiences (/experiences), Likes (/liked-activities).
- Footer navigation: Articles (/articles), Experiences, About Us, Contact, Terms of Use, Privacy Policy.

## Core User Flows
1. Explore experiences
   - List page with search, filters, location-aware suggestions, and pagination/infinite load.
   - Detail page per experience (MDX content, images, coupons, Google Maps info).
   - Like/save experiences (auth required).
2. AI Chat (Gappy Chat)
   - Conversational recommendations + map view.
   - Uses user location (with permission), travel type quiz data, and chat session history.
   - Supports shareable, read-only chat links (/share/[token]).
3. Travel Type Quiz
   - Multi-step quiz to determine travel type and preferences.
   - Results used for personalization; can be shown in modal and persisted.
4. Articles
   - Curated guides (top/new/all) with detail pages from MDX content.
5. Booking/QR/Review flow (business + ops)
   - QR code page for bookings (/qr/[bookingId]).
   - Vendor tracking/verification to mark completion (/track/[bookingId]).
   - Business review QR and user review submission (/business/review-qr/[bookingId], /review/[bookingId]).
   - Completed activities dashboard (/completed-activities) and vendor visit history (/business/visits).

## Content & Data Sources
- MDX content: `content/experiences` and `content/articles`.
- Localization: `public/locales` (en, ja, zh, ko, es, fr).
- Assets: `public/` (images, icons).

## Backend/Integrations
- Supabase: Auth (OAuth), likes, chat sessions, generated activity saves, review data, completion tracking.
- Google Maps (Places/Reviews + JS maps) for location and place details.
- Email delivery (SendGrid) for booking/QR flows.
- Analytics hooks (GA4) for search tracking.

## UI/Design System
- Green-themed brand (primary around #36D879) with white/gray base.
- Tailwind CSS utility styling, responsive layout (mobile/tablet/desktop).
- Typography: Poppins (headings), Inter (body).
- Core layout components: Header (nav + auth + search), Footer (links + social).

## Access Control / Visibility Notes
- Some pages are intended for ops/business use and are marked noindex.
- Chat and Likes require authentication.
- Location features require user permission.
