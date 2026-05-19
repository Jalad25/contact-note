# Roadmap
> **Last updated: 2026-05-19**

High-level direction for this plugin.

## Currently Scheduled

See [Milestones](https://github.com/Jalad25/contact-note/milestones) for currently tracked changes.

## Planned

Planned for upcoming releases. Order is approximate and may change.

> Nothing specifically planned yet. See currently scheduled for what's being worked on.

## Wishlist

Features being considered, but would like more feedback before pursuing. Order is not priority and some of these may never happen. See [CONTRIBUTING.md](CONTRIBUTING.md) on how to provide feedback!

- **VCF importing support** — bring contacts from another address book (phone, Google Contacts, iCloud, etc.) into the vault by importing a .vcf file. Each card lands as a standard contact note with the plugin's frontmatter shape, so imported contacts behave identically to ones created in-vault.
- **Custom frontmatter properties** — let users define their own contact properties beyond the built-in set (e.g., relationship, nickname, pronouns), with the same first-class treatment built-ins get: appear in the new-contact template, render on the contact card, and respect the same renaming and icon customization.

## Recently Shipped

- [**2.2.0**](https://github.com/Jalad25/contact-note/releases/tag/2.2.0) — Added `birthday`, `department`, and `lastInteraction` built-in properties. Added toggle for showing last modified date and time of a contact note in the contact note's contact card within the settings. Added a default icon for `company`. Added ability to include internal links in `company`, `title` and `department` values.
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
