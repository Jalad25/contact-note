# Development

This document outlines how to set up a local development environment and the internals of the plugin for contributors. For end-user documentation, see [README.md](./README.md). For the contribution process, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Prerequisites

- **[Node.js](https://nodejs.org/)**: v22 or later recommended
- **[Git](https://git-scm.com/)**: latest version
- **[Obsidian](https://obsidian.md/)**: 1.11.4 for the API's `Bases` and a local vault for testing. Older versions will not load the plugin.

## Getting Started

### 1. Clone the Repository

Clone the repository directly into your vault's plugin folder:

```bash
git clone <repository> <vault>/.obsidian/plugins/contact-note
cd <vault>/.obsidian/plugins/contact-note
```

Replace `<vault>` with the path to your Obsidian vault and `<repository>` with the link to your fork of the repository.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Build

```bash
npm run dev
```

This starts esbuild in watch mode. It will rebuild `main.js` automatically whenever source files change.

### 4. Enable the Plugin in Obsidian

1. Open Obsidian.
2. Go to **Settings → Community plugins**.
3. Enable **Contact Note**.
4. After making changes, reload Obsidian to pick up the rebuilt `main.js`. Either:
   - Open the developer console with `Ctrl+Shift+I` (Windows) or `Command+Option+I` (macOS) and press `F5` (or `Ctrl+R` (Windows) or `Command+R` (macOS)) to reload the window, or
   - Disable and re-enable the plugin in **Settings → Community plugins**.

> **Tip:** The [Hot Reload](https://github.com/pjeby/hot-reload) community plugin can reload the plugin automatically whenever `main.js` changes, removing the need to reload manually.

## Linting

```
npm run lint
```

ESLint 10 is configured via [`eslint.config.mjs`](eslint.config.mjs) (flat config). The setup extends `eslint-plugin-obsidianmd`'s recommended rules, which include Obsidian-specific guidance plus the typescript-eslint type-aware ruleset. Run lint before submitting a pull request.

## Production Build

```bash
npm run build
```

This performs a TypeScript type-check followed by an optimized esbuild bundle. The output is `main.js` in the project root.

The files required for a release are:

- `main.js`
- `manifest.json`
- `styles.css`

## Project Structure

```
contact-note/
├── src/
│   ├── main.ts                          # Plugin entry point, configuration, file events, view registration
│   ├── Contact.ts                       # Contact data model
│   ├── ContactNoteCard.ts               # Shared contact card builder (used by reading view, contacts view, and bases view)
│   ├── ContactNoteSettingTab.ts         # Settings tab UI; owns ContactNoteSettings and DEFAULT_SETTINGS
│   ├── SchemaMigration.ts               # data.json migrations
│   ├── views/
│   │   ├── ContactsView.ts              # Contacts view (ItemView); owns ContactsViewOptions and DEFAULT_VIEW_OPTIONS
│   │   └── ContactsBasesView.ts         # Bases-integrated contacts base view (BasesView)
│   ├── modals/
│   │   ├── NewContactModal.ts           # "New contact" dialog
│   │   └── EditViewFilterModal.ts       # Contacts view filter editor
│   └── suggesters/
│       └── FolderSuggest.ts             # Folder-path autocompletion for settings inputs
├── styles.css                           # Plugin styles
├── manifest.json                        # Obsidian plugin manifest
├── versions.json                        # Plugin/Obsidian version map
├── package.json                         # npm manifest and scripts
├── tsconfig.json                        # TypeScript config
├── esbuild.config.mjs                   # esbuild config
└── eslint.config.mjs                    # ESLint config
```

## Configuration Shape

User configuration is stored in `data.json` and loaded into `plugin.configuration` at startup. The runtime shape is composed in [`main.ts`](src/main.ts):

```ts
type ContactNoteConfiguration =
  { schemaVersion: number }
  & ContactNoteSettings   // from ContactNoteSettingTab.ts — fields edited in the settings tab
  & ContactsViewOptions;  // from views/ContactsView.ts — per-view options edited from the ⋮ menu
```

`DEFAULT_CONFIGURATION` is the merged default of the two sub-defaults plus `schemaVersion`. `loadSettings()` runs the saved object through `migrate(...)` and then strips any keys not in `DEFAULT_CONFIGURATION`, so removed fields self-clean from `data.json` on the next save.

## Contacts Base View and Sidebar View

The plugin registers two views under the same view type `CONTACT_CARDS_LIST_VIEW_TYPE`:

- `ContactsView` via `registerView`
- `ContactsBasesView` via `registerBasesView`

A few things worth knowing before changing the bases view:

- **Per-base options.** The `static getViewOptions(config)` method returns the toggle group rendered in Bases' options panel. Toggle values are read at render time via `this.config.get(...)` in `onDataUpdated`.
- **Property reads.** Scalar and list frontmatter fields are read through Bases' query API (`entry.getValue("note.<field>")`). The `socials` field is read directly from `metadataCache` because Bases' `ObjectValue` has no public key-enumeration API.
- **Injected New button.** Bases' native New button creates a file at the vault root using only the visible columns' frontmatter, which is the wrong location and shape for a contact. It cannot be intercepted, so the native button is hidden via CSS scoped to the plugin's bases view, and `injectNewButton()` adds a replacement that opens `NewContactModal`.
- **Default property order.** On first render of a fresh view, `ContactsBasesView` seeds the property order with `firstName`, `lastName`, `displayName` so the column picker is populated. Once the user customises the order, the seed is not reapplied.

The **Create new base with Contacts base view** command (and the matching `book-plus` ribbon icon) generates a `.base` YAML file pre-configured with the contact filter, ordering, and default toggle values. The file location and base-view name are driven by the `baseFolderPath` and `defaultBaseViewName` settings.

## Configuration Schema Migrations

Plugin configurations are versioned through [`SchemaMigration.ts`](src/SchemaMigration.ts). The `schemaVersion` field on `ContactNoteConfiguration` records the version of the data on disk, and `CURRENT_SCHEMA_VERSION` (defined in [`main.ts`](src/main.ts)) records the version the running code expects.

On every plugin load, `loadSettings()` runs the user's saved data through `migrate(...)`, which steps the data forward one version at a time using the entries in the `MIGRATIONS` array. If anything was migrated, the upgraded settings are written back to disk so the user only pays the migration cost once.

> Adding or removing a field that doesn't conflict with existing data does **not** require a migration. `loadSettings()` merges saved data over `DEFAULT_CONFIGURATION` (so new fields get their default) and drops keys that aren't in `DEFAULT_CONFIGURATION` (so removed fields disappear from `data.json` on the next save). A migration is only needed when an existing field needs to be renamed, restructured, or replaced with a non-default value.

### Adding a new migration

When a configuration change would break existing user data (renamed field, restructured value, removed field with a non-default replacement, etc.):

1. **Bump `CURRENT_SCHEMA_VERSION`** in [`main.ts`](src/main.ts) by one.
2. **Add a step function** named `migrate_N_to_N+1(raw)` under the *Migration Step Functions* region of [`SchemaMigration.ts`](src/SchemaMigration.ts). It receives the previous-version shape as `any` and returns `Partial<ContactNoteConfiguration> & { schemaVersion: N+1 }`.
3. **Register it** by adding `{ from: N, to: N+1, apply: migrate_N_to_N+1 }` to the `MIGRATIONS` array.
4. **Update the relevant type and default** to reflect the new shape:
   - For settings-tab fields, edit `ContactNoteSettings` and `DEFAULT_SETTINGS` in [`ContactNoteSettingTab.ts`](src/ContactNoteSettingTab.ts).
   - For per-view options surfaced through the `⋮` menu, edit `ContactsViewOptions` and `DEFAULT_VIEW_OPTIONS` in [`views/ContactsView.ts`](src/views/ContactsView.ts).

> [!IMPORTANT]
> Never edit a migration step after it has shipped. Users who already ran the old version of the step would silently desync from those who ran the new version. If a step needs correcting, write a *new* step that fixes the bad data forward.

## Testing

Currently, the project relies on manual testing within an Obsidian vault. When making changes, please verify:

- The plugin loads without errors (check the developer console with `Ctrl+Shift+I` (Windows) or `Command+Option+I` (macOS)).
- Existing contact notes still render correctly.
- Configuration persist across reloads.
- The Contacts view updates correctly when notes are added, modified, or deleted.
- A Contacts base view (`.base` file using the plugin's view) renders entries, responds to its `Display` toggles, and the injected **New** button creates a contact in the configured contacts folder or with the configured tag in the vault's root.
- Both folder-based and tag-based contact identification work.
- Auto-rename collision handling: creating a second contact with the same `First [Middle] Last` produces `First [Middle] Last 1.md` and surfaces a notice.
- Loading a `data.json` from a previous schema version triggers migration on first start, after which the file is rewritten in the current shape with `schemaVersion` stamped. Removed fields are stripped on save.
- The plugin renders and functions correctly in **both desktop and mobile**. All bugs, features, and UI changes should be verified against both before submission.
- The plugin renders correctly in **both light and dark mode**. All bugs, features, and UI changes should be verified against both themes before submission.

## Submitting Changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including how to file bugs and feature requests using the issue templates under [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

## Releasing

> [!IMPORTANT] 
> Releasing is restricted to project maintainers.

The release process is automated through two GitHub Actions workflows:

1. **Trigger the version bump workflow.** Go to **Actions → Bump version → Run workflow** and enter the new version (e.g. `1.1.0`), following [Semantic Versioning](https://semver.org/). The workflow updates `manifest.json`, `package.json`, and `versions.json`, commits the changes, and pushes a matching git tag.
2. **The release workflow runs automatically.** Pushing the tag triggers [`release.yml`](.github/workflows/release.yml), which validates that the tag matches `manifest.json`, builds the production bundle, and creates a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.

No local steps are required.

### Manual fallback

If the workflows are unavailable, the release can be performed manually:

1. Update the version in `manifest.json` and `package.json` to the new version number, following [Semantic Versioning](https://semver.org/).
2. Update `versions.json` to map the new plugin version to the minimum required Obsidian version.
3. Run `npm run build` to produce the production bundle.
4. Commit the version bump and tag the release: `git tag -a <version> -m "<version>"`.
5. Push the tag: `git push origin <version>`. This will still trigger the release workflow if it is operational; if not, continue to step 6.
6. Create a GitHub release attaching `main.js`, `manifest.json`, and `styles.css`.

## Troubleshooting Common Issues

### Plugin does not appear in Obsidian

- Verify the plugin folder is at `<vault>/.obsidian/plugins/contact-note/`.
- Make sure `main.js`, `manifest.json`, and `styles.css` are present in that folder.
- Toggle **Restricted mode** off in **Settings → Community plugins**.

### Changes are not reflected after rebuild

- Open the developer console (`Ctrl+Shift+I` (Windows) or `Command+Option+I` (macOS)) and press `F5` (or `Ctrl+R` (Windows) or `Command+R` (macOS)) to reload the window.
- Disable and re-enable the plugin in **Settings → Community plugins**.
- Restart Obsidian.

## Useful Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API reference](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin)
