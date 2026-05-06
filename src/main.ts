import {
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  TFile,
  MarkdownPostProcessorContext
} from "obsidian";
import { ContactsView, ContactsViewOptions, DEFAULT_VIEW_OPTIONS } from "./views/ContactsView";
import { ContactNoteSettingTab, ContactNoteSettings, DEFAULT_SETTINGS } from "./ContactNoteSettingTab";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactNoteCard";
import { ContactsBasesView } from "./views/ContactsBasesView";
import { migrate } from "./SchemaMigration";

//#region Constants

export const CONTACT_CARDS_LIST_VIEW_TYPE = "contact-note-list";

export const CURRENT_SCHEMA_VERSION = 0;

export type ContactNoteConfiguration = { schemaVersion: number } & ContactNoteSettings & ContactsViewOptions;

export const DEFAULT_CONFIGURATION: ContactNoteConfiguration = {
	schemaVersion: CURRENT_SCHEMA_VERSION,
  ...DEFAULT_SETTINGS,
  ...DEFAULT_VIEW_OPTIONS,
};

//#endregion

export default class ContactNotePlugin extends Plugin {
  configuration!: ContactNoteConfiguration;
  private renamingFiles = new Set<string>();

  async onload() {
    // Configuration
    await this.loadSettings();

		// Settings
    this.addSettingTab(new ContactNoteSettingTab(this.app, this));

    /* Ribbon Icons */
    this.addRibbonIcon("book-user", "Open contacts view", () => {
      void this.activateContactsView();
    });

    this.addRibbonIcon("book-plus", "Create new base with contacts base view", () => {
      void this.createContactsBase();
    });

    /* Commands */
    this.addCommand({
      id: "open-contacts-view",
      name: "Open contacts view",
      callback: () => { void this.activateContactsView(); },
    });

    this.addCommand({
      id: "create-contacts-base",
      name: "Create new base with contacts base view",
      callback: () => { void this.createContactsBase(); },
    });

    // Markdown Post Processor
    this.registerMarkdownPostProcessor((el, ctx) => {
      // Find the mod-frontmatter element to add the contact note to
      if (!el.classList.contains("mod-frontmatter")) return;
      this.processContactNote(el, ctx);
    });

    // View
    this.registerView(
      CONTACT_CARDS_LIST_VIEW_TYPE,
      (leaf) => new ContactsView(leaf, this)
    );

    // Bases view
    this.registerBasesView(
			CONTACT_CARDS_LIST_VIEW_TYPE, {
				name: "Contacts",
				icon: "book-user",
				factory: (controller, scrollEl) =>
					new ContactsBasesView(controller, scrollEl, this),
				options: ContactsBasesView.getViewOptions,
			}
		);

    /* Enforce contact file naming */
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file, _data, cache) => {
        if (!this.isContactFile(file)) return;
        await this.enforceContactFileName(file, cache.frontmatter);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file, _oldPath) => {
        if (!(file instanceof TFile)) return;
        if (!this.isContactFile(file)) return;
        if (this.renamingFiles.has(file.path)) {
          this.renamingFiles.delete(file.path);
          return;
        }
        const cache = this.app.metadataCache.getFileCache(file);
        await this.enforceContactFileName(file, cache?.frontmatter);
      })
    );

		/* File change events */
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file || !this.isContactFile(view.file)) {
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass(this.manifest.id);
          return;
        }
        view.contentEl.querySelector(".markdown-reading-view")?.addClass(this.manifest.id);
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file || !this.isContactFile(view.file)) {
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass(this.manifest.id);
          return;
        }
        view.contentEl.querySelector(".markdown-reading-view")?.addClass(this.manifest.id);
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file || !this.isContactFile(view.file)) {
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass(this.manifest.id);
          return;
        };
        view.contentEl.querySelector(".markdown-reading-view")?.addClass(this.manifest.id);
      })
    );

  }

//#region Configuration

  async loadSettings() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Disabling eslint as this is an issue triggered by Obsidian's API. Triggers locally
    const raw = await this.loadData();
    const { values, migrated } = migrate(raw);

    // Remove properties from data.json object that are no longer used
		// Does not include migrated properties (usually a rename)
    const known = new Set(Object.keys(DEFAULT_CONFIGURATION));
    const filtered: Record<string, unknown> = {};
    let droppedAny = false;
    if (values && typeof values === "object") {
      for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
        if (known.has(k)) filtered[k] = v;
        else droppedAny = true;
      }
    }

    this.configuration = Object.assign({}, DEFAULT_CONFIGURATION, filtered);
    if (migrated || droppedAny) await this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.configuration);
  }

//#endregion

//#region Contact File

  async createNewContact(firstName: string, lastName: string): Promise<void> {
    const file = await Contact.create(this.app, this.configuration, firstName, lastName);
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  isContactFile(file: TFile): boolean {
    if (this.configuration.useFolder) {
      const folder = normalizePath(this.configuration.folderPath);
      if (!folder) return false;
      return file.path === folder || file.path.startsWith(folder + "/");
    }

    const tag = this.configuration.tag.trim().replace(/^#/, "").toLowerCase();
    if (!tag) return false;

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return false;

    const tags: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Disabling eslint as this is an issue triggered by Obsidian's API. Triggers locally
    const fmTags = cache.frontmatter?.tags;
    if (Array.isArray(fmTags)) {
      tags.push(...fmTags.map((t: unknown) => String(t).replace(/^#/, "").toLowerCase()));
    } else if (typeof fmTags === "string") {
      tags.push(fmTags.replace(/^#/, "").toLowerCase());
    }

    if (cache.tags) {
      tags.push(...cache.tags.map((t) => t.tag.replace(/^#/, "").toLowerCase()));
    }

    return tags.includes(tag);
  }

  private async enforceContactFileName(file: TFile, frontmatter: Record<string, unknown> | undefined | null): Promise<void> {
    if (!frontmatter) return;

    const firstName = frontmatter.firstName !== null && typeof frontmatter.firstName === "string" ? String(frontmatter.firstName).trim() : "";
    const middleName = frontmatter.middleName !== null && typeof frontmatter.middleName === "string" ? String(frontmatter.middleName).trim() : "";
    const lastName = frontmatter.lastName !== null && typeof frontmatter.lastName === "string" ? String(frontmatter.lastName).trim() : "";

    if (!firstName || !lastName) return;

    const expectedName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    if (file.basename === expectedName) return;

    const folder = file.parent?.path;
    const folderPrefix = folder ? folder + "/" : "";

    let finalName = expectedName;
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(`${folderPrefix}${finalName}.md`)) {
      finalName = `${expectedName} ${counter++}`;
    }

    const newPath = `${folderPrefix}${finalName}.md`;

    if (finalName !== expectedName) {
      new Notice(`A contact named ${expectedName} already exists. Renamed to ${finalName}.`);
    }

    this.renamingFiles.add(newPath);
    await this.app.fileManager.renameFile(file, newPath);
  }

  private processContactNote(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;
    if (!this.isContactFile(file)) return;
    if (!ctx.frontmatter) return;

    const contact = Contact.fromCache(file, ctx.frontmatter as Record<string, unknown>);

    buildContactCard(this.manifest.id, this.app, el, contact, { showDetails: true, lastNameFirstOverride: false });
  }

//#endregion

//#region View

  async activateContactsView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(CONTACT_CARDS_LIST_VIEW_TYPE);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: CONTACT_CARDS_LIST_VIEW_TYPE, active: true });
      await workspace.revealLeaf(leaf);
    }
  }

  refreshContactsView() {
    for (const leaf of this.app.workspace.getLeavesOfType(CONTACT_CARDS_LIST_VIEW_TYPE)) {
      if (leaf.view instanceof ContactsView) {
        leaf.view.reinit();
      }
    }
  }

//#endregion

//#region Bases View

  async createContactsBase(): Promise<void> {
    const isContactExpr = this.configuration.useFolder
      ? `file.inFolder("${this.configuration.folderPath.replace(/"/g, '\\"')}")`
      : `file.hasTag("${this.configuration.tag.replace(/^#/, "").replace(/"/g, '\\"')}")`;

    const baseViewName = this.configuration.defaultBaseViewName || "Contacts";

    const yaml = [
      "formulas:",
      `  isContact: ${JSON.stringify(isContactExpr)}`,
      "filters:",
      "  and:",
      "    - formula.isContact",
      "views:",
      `  - type: ${CONTACT_CARDS_LIST_VIEW_TYPE}`,
      `    name: ${baseViewName}`,
      "    order:",
      "      - note.firstName",
      "      - note.lastName",
      "      - note.displayName",
      "    sort:",
      "      - property: note.lastName",
      "        direction: ASC",
      "    condensed: true",
      "    lastNameFirst: true",
      "    showDetails: false",
      "",
    ].join("\n");

    const raw = normalizePath(this.configuration.baseFolderPath ?? "");
    const folder = raw === "/" ? "" : raw;
    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }
    const folderPrefix = folder ? `${folder}/` : "";

    let name = baseViewName;
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(`${folderPrefix}${name}.base`)) {
      name = `${baseViewName} ${++n}`;
    }
    const file = await this.app.vault.create(`${folderPrefix}${name}.base`, yaml);
    await this.app.workspace.getLeaf(false).openFile(file);
  }

//#endregion
}
