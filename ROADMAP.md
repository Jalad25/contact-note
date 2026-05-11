# Roadmap
> **Last updated: 2026-05-10**

High-level direction for this plugin.

## In Progress

What I'm actively working on.

> Currently not working on any specific feature. Will start back up soon.

## Planned

Planned for upcoming releases, roughly in order.

- **New built-in property: `birthday`** — a date property for tracking contact birthdays. Available alongside the existing built-in fields and respecting the same frontmatter customization (rename, icon). Will appear under the company in the contact card with an icon.
- **New built-in property: `department`** — a text property for the contact's department within their company, complementing the existing title and company fields. Available alongside the existing built-in fields and respecting the same frontmatter customization (rename, icon). Will appear under the company in the contact card and before the birthday.
- **New built-in property: `lastInteraction`** — a date property recording when last interacted with the contact (maintained by the user). Available alongside the existing built-in fields and respecting the same frontmatter customization (rename, icon). Will appear only in a Contact Note contact card at the top right-side corner of the card.
- **New built-in property: `lastModified`** — an automatically maintained date property reflecting when the contact note was last edited. Available alongside the existing built-in fields and respecting the same frontmatter customization (rename, icon). Will not appear in the contact card.

## Wishlist

Features being considered, but would like more feedback before persuing. Order is not priority and some of these may never happen. See [Contributing](#contributing) on how to provide feedback!

- **VCF importing support** — bring contacts from another address book (phone, Google Contacts, iCloud, etc.) into the vault by importing a .vcf file. Each card lands as a standard contact note with the plugin's frontmatter shape, so imported contacts behave identically to ones created in-vault.
- **Custom frontmatter properties** — let users define their own contact properties beyond the built-in set (e.g., relationship, nickname, pronouns), with the same first-class treatment built-ins get: appear in the new-contact template, render on the contact card, and respect the same renaming and icon customization.

## Recently Shipped

- [**2.1.0**](https://github.com/Jalad25/contact-note/releases/tag/2.1.0) — Customize built-in frontmatter property names and icons to match vault's existing conventions.
- [**2.0.0**](https://github.com/Jalad25/contact-note/releases/tag/2.0.0) — Render contacts as cards inside Obsidian Bases.
- [**1.0.0**](https://github.com/Jalad25/contact-note/releases/tag/1.0.0) — Initial release: contact card preview in contact notes and a sidebar panel listing all contacts in the vault.

## Out of Scope

To save everyone time, these have been considered and declined:

- **Two-way sync with external address books (Google Contacts, iCloud, CardDAV)** — out of scope as a built-in feature. Sync belongs in a dedicated plugin or external tool; conflating it with the data model would compromise both.
- **Bundled third-party services (CRM integrations, email sending, calendar invites)** — these belong in purpose-built plugins. This plugin focuses on representing contacts in your vault.

## Contributing

Found a bug? Got an idea? Feature you have in mind? Got some feedback?

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.
