# OWNER RULE — Advertising / Connection Platform Only

**Status:** BINDING OWNER PRODUCT BOUNDARY

**Date:** 2026-08-14

## Owner decision

VVIP TIGER is an advertising, discovery, and direct-contact platform.

Its role is to reduce the distance between:

- seller and buyer; and
- service provider and beneficiary.

The platform may help users discover offers and contact each other directly. It is **not a party to the transaction or service relationship after contact**.

## Explicit non-responsibilities after contact

The platform does not own, execute, guarantee, mediate, or resolve the parties' subsequent:

- price negotiation or agreement;
- purchase/payment for the advertised good or service;
- checkout or escrow;
- delivery, shipping, handover, or logistics;
- service execution;
- warranty or compensation;
- settlement; or
- buyer/seller or provider/beneficiary dispute resolution.

## Product invariant

No checkout, escrow, delivery operation, transaction settlement, transaction commission, or platform-run dispute-resolution workflow may be introduced as an assumed platform feature.

Any future proposal that would make VVIP TIGER a transaction intermediary requires a new explicit OWNER decision and separate legal/product approval before implementation.

## Platform-owned responsibilities

This rule does not remove responsibilities that belong to operating the platform itself, including:

- advertising/discovery/contact product operation;
- platform account and advertising controls;
- platform security;
- moderation, abuse, spam, and illegal-content controls;
- technical operations and reliability;
- billing for VVIP TIGER's own advertising products/services; and
- legally required platform compliance.

## Engineering enforcement

F03 and later authorization/capability layers must fail closed for any capability whose purpose is to make the platform an intermediary for checkout, escrow, shipping/delivery, transaction settlement, or disputes.

This file is an OWNER reference and must be linked from the current FUSION authority chain.