<p align="center">
  <img src="assets/PluginBanner.png" alt="Contact Note" align="center" width=800>
</p>

<p align="center">
  <!--FOR THE FUTURE <img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fcontact-note.json" alt="Obsidian plugin"> -->
  <img src="https://img.shields.io/github/v/release/Jalad25/contact-note" alt="GitHub release">
  <img src="https://img.shields.io/github/downloads/Jalad25/contact-note/total" alt="Assets downloaded">
</p>

> [!WARNING]
> **Breaking change in 2.0.0:** The `email` and `phone` frontmatter
> properties were renamed to `emails` and `phoneNumbers`. Existing
> contact notes using the old keys will continue to load but their
> emails and phone numbers will not appear on contact cards until
> renamed. Update each note's frontmatter (or run a vault-wide
> find-and-replace) to migrate.
>
> **Workaround in 2.1.0**: If you'd rather keep using the old keys, you can rename the plugin's
> built-in property names back to `email` and `phone` (or anything else)
> in settings under [Frontmatter Properties Customization](#frontmatter-properties-customization).

# Contact Note

An [Obsidian](https://obsidian.md/) plugin that turns frontmatter in notes designated as contacts into visual contact cards. Browse them with a built-in searchable, filterable view or surface them through an Obsidian Bases view that adds sorting, grouping, and extensive filtering and search.

[assets/Preview.mp4](https://github.com/user-attachments/assets/f6eadae9-9225-4b7b-8591-f3df1e274632)

## Features

- **Contact Card in Note** — Renders a contact card in reading mode for any note identified as a contact.
- **Contacts View in a dedicated panel** — A dedicated sidebar view that lists all contact notes with search, alphabet filter, display options, and a filter limiting the view to entries that match one or more frontmatter conditions.
- **Contacts View in an Obsidian Base** — Render the same contact cards inside an Obsidian `.base` file, with grouping, sorting, searching, and filtering driven by Bases.
- **Contact Note Template** — Create new contacts from the contacts panel or a base view with an auto-generated frontmatter template.
- **Contact File Naming Enforcement** — Enforces file naming in `First Middle Last` format automatically. Duplicate names are disambiguated with a numeric suffix.
- **Multiple Values for Certain Frontmatter Properties** — Supports multiple emails, phone numbers, and social media profiles per contact.
- **Contact Note Identification** — Contacts identified by folder or tag.
- **Light and Dark Mode Support** — All plugin UI is styled for both Obsidian themes.
- **Desktop and Mobile Support** — Works in the Obsidian desktop application and the Obsidian mobile app.

## Installation

### BRAT

While Contact Note is awaiting inclusion in the Obsidian Community Plugins directory, [BRAT](https://github.com/TfTHacker/obsidian42-brat) is the recommended way to install and stay up to date. BRAT installs plugins directly from their GitHub repository and auto-updates them on each release.

1. Install **BRAT** from **Settings → Community plugins → Browse** and enable it.
2. Open the command palette (`Ctrl+P` (Windows) or `Command+P` (macOS)) and run **BRAT: Add a beta plugin for testing**.
3. Enter the repository URL: `https://github.com/Jalad25/contact-note`.
4. Choose whether to track the latest release or the latest commit, then select **Add Plugin**.
5. Open **Settings → Community plugins** and enable **Contact Note**.

To get future updates, run **BRAT: Check for updates to all beta plugins** from the command palette, or enable auto-update in BRAT's settings.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. In your vault, create the folder `.obsidian/plugins/contact-note/` if it does not already exist.
3. Copy the downloaded files into that folder.
4. Open Obsidian, go to **Settings → Community plugins**, and enable **Contact Note**.

### Obsidian Community Plugins

> *Coming soon! Currently pending listing in the directory.*

1. Open Obsidian and go to **Settings → Community plugins**.
2. If restricted mode is on, select **Turn on community plugins**.
3. Select **Browse** and search for **Contact Note**.
4. Select **Install**, then **Enable**.

## Usage

### Identifying Contact Notes

A note is treated as a contact note in one of two ways, configured in settings:

- **By folder**: any note inside a specified folder (e.g. `Contacts/`) is a contact note. The match is **recursive**, meaning every note in the folder *and any of its subfolders* is treated as a contact, so you can group contacts into nested folders (`Contacts/Work/`, `Contacts/Family/`, etc.) without losing them from the view.
- **By tag**: any note tagged with a specified tag (e.g. `#contact`) is a contact note.

### Creating a Contact Note

To manually create a new contact, create a new note with at least the `firstName` and `lastName` frontmatter properties in either the path of contact notes or with the contact tag specified in the plugin settings. For a list of all frontmatter properties recognized by the plugin, see [Contact Note Frontmatter Reference](#contact-note-frontmatter-reference) below.

To create a new contact using the plugin's template, select the **user-plus** button in the panel header or the **New** button in the base view to open the new contact dialog. Enter a first and last name and select **Create**.

A new note will be created with a pre-populated frontmatter template and opened automatically.

> [!IMPORTANT]
> The plugin automatically renames contact notes to match the format `First Middle Last` whenever the `firstName`, `middleName`, or `lastName` frontmatter values change. Manual renames are also corrected.
>
> If a file with the target name already exists, the new contact is renamed to `First Middle Last 1` (incrementing the suffix until the name is unique) and a notice is shown so you know the disambiguation happened.

### Browsing Contacts

There are two ways to browse contacts in the vault:

- **[Sidebar Panel](#contacts-view-in-a-panel)** — A dedicated sidebar panel that lists every contact's card with search, alphabet filter, and a configurable view filter.
- **[Bases View](#contacts-view-in-a-base)** — A custom view type for Obsidian Bases that lists every contact's card inside a `.base` file and adds Bases' searching, grouping, sorting, and filtering on top.

Both surfaces render the same contact cards and offer the same display options (`Condensed`, `Show contact details`, `Last name first`).

## Contact Note Frontmatter Reference

All fields are optional except `firstName` and `lastName`.

> [!NOTE]
> Any of the property names below can be renamed to suit your existing notes. See [Frontmatter Properties Customization](#frontmatter-properties-customization) in the Settings Reference.

| Field | Type | Description |
|---|---|---|
| `firstName` | text | **Required.** The contact's first name. |
| `lastName` | text | **Required.** The contact's last name. |
| `middleName` | text | Middle name or initial. Used in the display name and file name. |
| `displayName` | text | Overrides the resolved display name everywhere if set. |
| `title` | text | Job title or role. |
| `company` | text | Company or organization name. |
| `emails` | text or list | One or more email addresses. |
| `phoneNumbers` | text or list | One or more phone numbers. |
| `photo` | text | Vault path to a photo file (e.g. `Attachments/jane.jpg`). |
| `aliases` | list | Obsidian aliases for the note. Pre-populated with `firstName` on creation when using the new contact dialog. Not used directly by plugin. |
| `socials` | list | List of social media handles. See [Socials](#socials) below. |

**Example:**

```yaml
---
firstName: Geordi
middleName: Terror
lastName: La Forge
displayName: Papa
company: Geordi Bytes LLC.
title: Professional Cutie
emails:
  - geordi@notarealemail.com
phoneNumbers:
  - 123-456-7890
photo: Attachments/Geordi.jpg
aliases:
  - Geordi
socials:
  - github: geordiBytes
  - linkedin: geordi-bytes
---
```

### Socials

Social profiles are defined as a list of single-key objects under the `socials` frontmatter field. The key is the platform name and the value is the handle (the `@` prefix is optional).

```yaml
socials:
  - twitter: geordibytes
  - github: geordiBytes
  - linkedin: geordi-bytes
```

Supported platforms:

| Platform | Key |
|---|---|
| Bluesky | `bluesky` |
| Discord | `discord` |
| Facebook | `facebook` |
| GitHub | `github` |
| Instagram | `instagram` |
| LinkedIn | `linkedin` |
| Pinterest | `pinterest` |
| Reddit | `reddit` |
| Snapchat | `snapchat` |
| Telegram | `telegram` |
| TikTok | `tiktok` |
| Twitch | `twitch` |
| Twitter / X | `twitter` |
| YouTube | `youtube` |

Platforms not in this list will still display the handle as plain text without a link.

## Contact Card

![Contact card](assets/screenshots/contact-card.png)

In reading mode, any contact note with a valid `firstName` and `lastName` frontmatter renders a contact card in place of the frontmatter block. The card displays the contact's photo, name, title, company, email addresses, phone numbers, and social media profiles.

### Display Name Resolution

The display name is resolved in the following order:

1. `displayName` if set
2. `firstName` + `middleName` + `lastName`

### Photo Display

If the `photo` path is not set, the contact card displays a default person icon in its place.

## Contacts View in a Panel

Open the contacts view in a panel by selecting the **book-user** ribbon icon or running the **Open contacts view in panel** command.

### Header Buttons

| Icon | Action |
|---|---|
| **New contact** | Open the New contact dialog. |
| **Search contacts** | Toggle the search bar (see [Search](#search)). |
| **View options** (`⋮`) | Open the view options menu. |

### Search

Select the **search** icon in the header to show the search bar. The search filters by first name, last name, middle name, and display name.

### View Options Menu

The `⋮` menu contains options that affect the current view only and are persisted across sessions:

| Option | Description |
|---|---|
| Condensed | Show only the photo and name on each card. Hides and disables **Show contact details** while enabled. |
| Show contact details | Expand each card to include emails, phone numbers, and socials. Available only when **Condensed** is disabled. |
| Last name first | Overrides the resolved display name and displays names as `Last, First Middle`. Does not affect the contact card within a note. |
| Edit view filter… | Open the [View Filter](#view-filter) editor. |

### View Filter

Add one or more filter conditions to limit which contacts appear in the panel view. All conditions must match for a contact to be shown (AND logic). Open the editor from **Edit view filter…** in the view's `⋮` menu.

Each condition targets a frontmatter property by key and supports the following operators:

| Operator | Value required | Description |
|---|---|---|
| `Contains` | Yes | Property value contains the given string, or array includes a matching item. |
| `Is` | Yes | Property value exactly equals the given string. |
| `Exists` | No | Property is present and has a non-empty value. |
| `Is true` | No | Property value is `true` (boolean or string). |
| `Is false` | No | Property value is `false` (boolean or string). |

Filters apply to any frontmatter property, including custom fields not used by the plugin.

### Alphabet Filter

Select any letter in the alphabet bar to filter contacts whose last name starts with that letter. Select the same letter again to clear the filter.

## Contacts View in a Base

There are two commands for adding a contacts view to a base:

| Command | What it does |
|---|---|
| **Create new base with contacts view** | Creates a new `.base` file pre-configured with the `isContact` formula along with a filter using the formula to filter the contacts view to your configured contact folder or tag, sorts by last name, pre-selects properties of `firstName`, `lastName`, `middleName`, and `displayName` for searching, and seeds the default settings for the Display toggles. The file is placed in the folder set by **New base folder path** (see [Settings Reference](#settings-reference)) and is opened automatically. |
| **Add contacts view to base** | Available only when the active file is a `.base` file. Appends a new contacts view to the existing base and adds the `isContact` formula if it is not already present. |

Both commands prompt for a view name (and a base file name in the case of **Create new base with contacts view**). If the chosen file name already exists in the target folder, a numeric suffix is appended and a notice is shown.

When **Add contacts view to base** is run on a base whose existing `isContact` formula does not match your current contact identification settings, the existing formula is left untouched and a notice is shown so you can update it by hand.

> [!IMPORTANT]
> Creating a Contacts view in a `.base` file without using the listed commands will result in a view without the pre-configured sorting, formulas, and filtering.

### `+ New` Button

The New button opens the same New contact dialog as the panel view, ensuring new files land in the correct folder with the correct frontmatter shape.

### Display Options

The contacts view exposes three toggles in the Bases options panel under **Display**:

| Option | Description |
|---|---|
| Condensed | Show only the photo and name on each card. Hides and disables **Show contact details** while enabled. |
| Show contact details | Expand each card to include emails, phone numbers, and socials. Hidden while **Condensed** is enabled. |
| Last name first | Overrides the resolved display name and displays names as `Last, First Middle`. Does not affect the contact card within a note. |

> [!IMPORTANT]
> Though the Contacts view looks simliar to the Obsidian Bases built-in Cards View, the Contacts View will not change what it displays in the card based off the Properties selected (or `order` set in the raw `.base` file). The card will only change its display based on the display options set.

### Default New Base Configuration

The **Create new base with contacts view** command writes a `.base` file with the following structure:

```yaml
formulas:
  isContact: "file.inFolder(\"...\")" #Or file.hasTag(\"...\") depending on settings at time of creation
views:
  - type: contact-note-list
    name: Contacts
    filters:
      and:
        - formula.isContact
    order: #Properties in the view
      - note.firstName
      - note.middleName
      - note.lastName
      - note.displayName
    sort:
      - property: note.lastName
        direction: ASC
    condensed: true
    lastNameFirst: true
    showDetails: false
```

If your settings identify contacts by tag instead of folder, the formula is written as `file.hasTag("...")` (using your configured tag).

Each piece serves a purpose:

| Section | What it does |
|---|---|
| `formulas.isContact` | Captures your **Contact File Identification** setting at the moment the base was created. `file.inFolder("…")` if you were in folder mode, `file.hasTag("…")` if you were in tag mode. The expression is written into the file as a literal string and **does not** track future changes to the settings. If you switch identification mode or rename your contacts folder/tag, edit the formula in the base by hand or run **Create new base with contacts view** again to generate a fresh file. |
| `views[].type: contact-note-list` | Tells Bases to render this view through Contact Note's renderer. Without this, Bases falls back to its built-in table or card view and the plugin's contact cards are not used. |
| `views[].name` | The label shown in the base's view tabs. |
| `views[].filters.and` | Applies `isContact` as a filter to this view. |
| `views[].order` | The properties shown in the Bases property picker. The plugin ignores this for rendering, but Bases uses it for search. |
| `views[].sort` | The default sort order for the view. |
| `views[].condensed` / `lastNameFirst` / `showDetails` | The starting values for the **Display** toggles described above. |

### Editing a Base Freely

A `.base` file is plain YAML, and the plugin treats whatever Bases passes it as authoritative. You're free to edit any of the sections above, add views, change sorts, add groupings, and so on.

A few things to know before you edit:

- **`type: contact-note-list` is required.** A view without this exact value renders through Bases' built-in views, not Contact Note's. The plugin's three Display toggles, the New button, and the contact card layout only exist on views with this type.
- **`formulas.isContact` is a snapshot, not a live link.** It's written into the file once when the base is created (or when **Add contacts view to base** is run on a base that doesn't already have it) and is never touched again by the plugin. You can edit it freely to broaden or narrow the filter, but if you later change the **Identify contacts by folder** setting (or rename the folder/tag) the formula will *not* update on its own. You'll need to edit it by hand or recreate the base.
- **Removing `formulas.isContact` or the view's `filters.and` removes the contact-note guarantee.** If the filter no longer pins the view to your contacts folder or tag, non-contact notes can leak into the view, and the cards will render with whatever frontmatter happens to be present (often empty placeholders).
- **`sort` can be replaced freely.** Sort by company, by `displayName`, by any frontmatter property. Bases applies the sort before handing entries to the view.
- **Removing `order` (properties) is harmless visually but changes how Bases searches.** The plugin renders cards regardless of the `order` list, but Bases' built-in search bar only matches against properties that are listed there. Keep `note.firstName`, `note.middleName`, `note.lastName`, and `note.displayName` in `order` to keep search working the same way it does in the panel view.
- **You can have multiple views in one base.** Add another entry under `views:` (for example a Bases table view) to switch between contact cards and a tabular layout in the same file. Each view stores its own sort, group, properties, and filter. Adding a contacts view by hand (rather than via **Add contacts view to base**) will not apply the default `sort`, `order`, or per-view `filters`.
- **Search and the contact card body don't always agree.** Bases' search bar matches against the properties in `order`, not the rendered card. To add more properties to search off of, select them in the properties dropdown or add them to the `order` list.

### Creating a base without the plugin

You can also create a `.base` file the normal Obsidian way (right-click or long-press on mobile in the file tree → **New base**, or use the built-in command). When you do, none of the plugin's defaults are present. The new base ships with Bases' generic table view, no filter, no sort, and no display toggles. Specifically you will be missing:

- The `isContact` formula and the per-view filter that limits entries to your configured contact folder or tag. Every note in the vault is shown until you add one.
- The default sort by last name (entries are listed in Bases' default order, usually file name).
- The `order` list that wires Bases' search to first/middle/last/display name fields.
- The `condensed: true` / `lastNameFirst: true` / `showDetails: false` defaults for the contact card view.
- The plugin's contact card view itself. Until you change `type:` to `contact-note-list`, the file renders with Bases' generic table or card view.

The simplest way to add a contacts view to an existing base is to run **Add contacts view to base** while the base is the active file. It appends a fully configured contacts view and adds the `isContact` formula if it's missing.

## Settings Reference

### Contact File Identification

| Setting | Description | Default |
|---|---|---|
| Identify contacts by folder | When enabled, notes inside the specified folder are treated as contacts. When disabled, notes with the specified tag are used instead. | Enabled |
| Contacts folder path | Path to the contacts folder, relative to the vault root. The match is recursive: every note in this folder and in any of its subfolders is treated as a contact. Cannot be set to the vault root. | `Contacts` |
| Contact tag | Tag used to identify contact notes (without the `#`). Only shown when folder mode is disabled. | `contact` |

### Contacts View in a Panel

| Setting | Description | Default |
|---|---|---|
| View name | Name shown at the top of the panel view. | `Contacts` |

> Display options (`Condensed`, `Show contact details`, `Last name first`) and the view filter editor are managed through the view's `⋮` menu. See [View Options Menu](#view-options-menu).

### Contacts View in a Base

| Setting | Description | Default |
|---|---|---|
| New base folder path | Folder where new contacts bases are created, relative to the vault root. Leave empty to place them in the vault root. | *(empty)* |

> The base file name and the in-base view name are entered in the dialog opened by **Create new base with contacts view** or **Add contacts view to base**, not in settings.

### Frontmatter Properties Customization

This section lets you override the frontmatter property names the plugin reads from and writes to, and the icons it displays for properties that show one.

| Column | What it does |
|---|---|
| Property | The plugin's built-in name for the property. This is fixed and is what the plugin uses internally. |
| Override name | The frontmatter key the plugin will read from and write to instead of the built-in name. Leave blank to use the built-in name. |
| Icon | The [Lucide icon](https://lucide.dev/icons/) name shown beside the property's value(s) on the contact card. Leave blank to use the default icon. |

#### Caveats

- **Existing notes are not rewritten.** Renaming `emails` to `email` does not touch any contact note already in your vault. Notes still using the old name will stop being read until you either rename them by hand or change the override back.
- **Existing `.base` files are not rewritten either.** A base created before you changed an override still references the old property name in its `order` (properties) and `sort`. New bases created via **Create new base with contacts view** or **Add contacts view to base** pick up the current override.
- **Icons are restricted to Lucide names.** Obsidian ships with the [Lucide](https://lucide.dev/icons/) icon set built in, so any name listed there can be used. Names not in that set will render nothing.

## Contributing

Contributions of all kinds are welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for current focus and planned features.

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
