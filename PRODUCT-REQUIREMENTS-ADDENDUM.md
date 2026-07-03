# Product Requirements Addendum

This document captures the expanded product scope for the TIGER VVIP platform beyond the current page-based social feed implementation.

It is written as a planning and specification reference so development, QA, and future backend work can stay aligned.

## 1. Core Social Experience

- Stories with 24-hour expiry, replies, reactions, viewers, and archive.
- Post sharing flows: repost, share with comment, send in chat, copy link, external share.
- Mentions and tags in text, comments, and images.
- Privacy levels: public, friends, followers, only me, custom list, hide from specific people.
- Follow system: follow, unfollow, mutual friends if enabled, follow requests for private accounts.
- Save system: saved posts, save collections, remove from saved items.

## 2. Messaging And Notifications

- Private chat with text, images, video, files, and voice notes.
- Typing indicator, read receipts, last seen, message deletion.
- Notifications for likes, comments, replies, follows, mentions, messages, and system alerts.
- Push notifications and grouped notification handling.

## 3. Profile And Identity

- Full profile editing, cover photo, profile photo, bio, location, website, and social links.
- Account types: public, private, verified, VIP, business, creator.
- Connected accounts and profile analytics.

## 4. Feed, Discovery, And Search

- Feed ordering beyond time-based sorting: relevance, affinity, trending, deduplication.
- Switchable feed modes such as newest and most relevant.
- Smart recommendations for people, pages, groups, videos, and hashtags.
- Search across people, pages, groups, posts, videos, and hashtags.

## 5. Media And Video

- Upload pipeline for photos and video with compression, thumbnail generation, and CDN-ready delivery.
- Video playback controls: autoplay, pause on exit, PiP, quality selection, playback speed, captions.
- Photo editing tools such as crop, rotate, filters, and album support.
- Reels with vertical playback, music, effects, comments, save, and share.

## 6. Pages, Groups, And Community

- Pages creation, page admins, multiple moderators, page insights, page inbox.
- Groups with public/private modes, member approval, group-only posts, and moderation roles.

## 7. Moderation, Reports, And Trust

- Reporting for posts, comments, users, messages, and pages.
- Activity log for likes, comments, shares, saved items, and deleted posts.
- Trust and reputation signals, device/session monitoring, suspicious account detection, anti-spam controls.

## 8. Settings And Account Safety

- Language, dark/light mode, sessions, devices, password change, 2FA, delete account, disable account.
- Login session management and audit trails for important actions.

## 9. Admin Console

- User, page, group, report, ads, subscriptions, badges, backup, and operational log management.
- Fine-grained admin permissions rather than broad role buckets.

## 10. Performance And Reliability

- Progressive loading, caching, lazy loading, infinite scroll, offline cache, media compression.
- Clear behavior for loading, slow network, retry, and offline state.

## 11. Security

- Encrypted data handling where applicable, JWT/OAuth-style auth flows, rate limiting, CAPTCHA, anti-spam, audit logs.
- Session expiration, token expiry, and error logging.

## 12. UX Micro-Interactions

- Skeleton loading, pull to refresh, swipe back, page transitions, haptic feedback, toast messages, success/error feedback.

## 13. VIP Differentiators

- Gold VIP badge.
- Paid memberships and exclusive perks.
- VIP-only content and premium profile presentation.
- Advanced analytics, direct support, invites, and exclusive events.

## 14. Non-Functional Specification Topics

The platform specification should also define:

- Application states for offline, loading, error, retry, and recovery.
- Exact messages, icons, duration, and placement for every notification.
- Post lifecycle states such as draft, queued, uploading, published, hidden, deleted, archived, review, and rejected.
- Video lifecycle steps from upload to processing to CDN delivery.
- Per-button behavior, including long press, offline handling, success, failure, and permissions.
- Accessibility requirements such as screen reader support, contrast, typography scaling, and focus states.
- Logging and observability requirements for user actions and admin actions.

## 15. Delivery Documents Recommended

For a production-grade implementation, the following documents should be maintained together:

- BRD: Business Requirements Document.
- SRS: Software Requirements Specification.
- User Flow.
- Information Architecture.
- Database Schema.
- API Documentation.
- Admin Panel Specification.
- Security Specification.
- QA / Testing Checklist.

## 16. Development Principle

The system should be built in a modular way so future features can be added without redesigning the core app.

Recommended future modules:

- Marketplace.
- Live streaming.
- AI services.
- Ads manager.
- Subscriptions.
- Digital wallet.
- Multi-language and multi-country support.

## 17. Button Definition Matrix

Every interactive control should be documented with:

- Button name.
- Primary action.
- Long-press action.
- Offline behavior.
- Error behavior.
- Success message.
- Failure message.
- Required permissions.

## 18. Current Scope Note

The current repository already implements the page-based social feed foundation, bilingual UI, optional Supabase sync, analytics scaffolding, ads scaffolding, and in-app browser behavior.

The items in this document represent the broader product target for the next phases.

## 19. Newly Implemented In Current Codebase

- Stories rail with story viewer, next/prev controls, and reply entry path.
- Post sharing behavior with share sheet / clipboard fallback.
- Local saved-post toggling for feed cards.
- Mention and hashtag linkification inside post text.