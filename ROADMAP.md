# Roadmap
> **Last updated: 2026-06-12**

High-level direction for this plugin.

## Currently Scheduled

See [Milestones](https://github.com/Jalad25/contact-note/milestones) for currently tracked changes.

## Planned

Planned for upcoming releases. Order is approximate and may change.

- **Frontmatter property usage toggle** — let users toggle if specific built-in frontmatter properties are used by the Contact Note plugin within contact cards and new contact note templates. Will be set in the settings tab. `firstName`, `middleName`, and `lastName` will always be included (not able to be toggled).
- **Contact Card details view toggle** — add option in settings tab to toggle contact card details view to render all values in the details section of the contact card as collapsable lists.
- **New built-in property: `addresses`** — a property containing EITHER an array of OR a map of named address entries (e.g. home, work) for a contact. Each address entry contains `streetLineOne`, `streetLineTwo`, `city`, `state`, `zip`, and `country`, with the array version requiring an additional `addressName` property in the frontmatter to allow for the usage of the optional icon and label defined in the settings tab. Available alongside the existing built-in fields and respecting the same frontmatter customization (rename, icon, toggle usage). The `addresses` key itself can be renamed and a list of address names, along with optional icon and label, can be defined within the settings tab. User can add as many named entries as they'd like. The user will also be able to define the default icon to be used if no named address entries are present in the settings tab. Will appear to the right of (or after in collapsible list) phone numbers in contact card.
- **Add `emails` and `phoneNumbers` support for mapped, named entries** - *REQUIRES MIGRATION* similar to `addresses`, the `emails` and `phoneNumbers` properties will allow a map of named entries (e.g. home, work) to be set in the property, in addition to allowing arrays. For array versions an additional `emailName` for `emails` and `phoneNumberName` for `phoneNumbers` properties will be required if the user wishes to use the optional icon and label defined in the settings tab. User can add as many named entries as they'd like. The user will also be able to define the default icon for each parent property to be used if no named entries are present in the settings tab.

## Wishlist

Features being considered, but would like more feedback before pursuing. Order is not priority and some of these may never happen. See [CONTRIBUTING.md](CONTRIBUTING.md) on how to provide feedback!

- **Custom frontmatter properties** — let users define their own contact properties beyond the built-in set (e.g., relationship, nickname, pronouns), with the same first-class treatment built-ins get: appear in the new-contact template, render on the contact card, and respect the same renaming and icon customization.
- **Templates** - let users define what properties (including possibly custom if done first) the template created by the New button populate.
- **VCF importing support** — bring contacts from another address book (phone, Google Contacts, iCloud, etc.) into the vault by importing a .vcf file. Each card lands as a standard contact note with the plugin's frontmatter shape, so imported contacts behave identically to ones created in-vault.

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
