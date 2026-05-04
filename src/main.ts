import {
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  TFile,
  MarkdownPostProcessorContext
} from "obsidian";
import { ContactListView } from "./ContactListView";
import { ContactNoteSettingTab } from "./ContactNoteSettingTab";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactCard";
import { CURRENT_SCHEMA_VERSION, migrate } from "./SchemaMigration";

//#region Types/Objects/Interface

export interface FrontmatterFilter {
  property: string;
  operator: "contains" | "is" | "exists" | "is true" | "is false";
  value: string;
}

export interface ContactNoteSettings {
  schemaVersion: number;
  useFolder: boolean;
  folderPath: string;
  tag: string;
  listTitle: string;
  condensedList: boolean;
  lastNameFirst: boolean;
  defaultFilters: FrontmatterFilter[];
}

//#endregion

//#region Constants/Defaults

export const DEFAULT_SETTINGS: ContactNoteSettings = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  useFolder: true,
  folderPath: "Contacts",
  tag: "contact",
  listTitle: "Contacts",
  condensedList: true,
  lastNameFirst: true,
  defaultFilters: [],
};

//#endregion

export default class ContactNotePlugin extends Plugin {
  settings!: ContactNoteSettings;
  private renamingFiles = new Set<string>();
  viewTypeContactList: string = `${this.manifest.id}-list`;

  async onload() {
    // Settings
    await this.loadSettings();
    this.addSettingTab(new ContactNoteSettingTab(this.app, this));

    // Ribbon
    this.addRibbonIcon("book-user", "Open contact list", () => {
      void this.activateContactListView();
    });

    // Command
    this.addCommand({
      id: "open-contact-list",
      name: "Open contact list",
      callback: () => { void this.activateContactListView(); },
    });

    // Markdown Post Processor
    this.registerMarkdownPostProcessor((el, ctx) => {
      // Find the mod-frontmatter element to add the contact note to
      if (!el.classList.contains("mod-frontmatter")) return;
      this.processContactNote(el, ctx);
    });

    // View
    this.registerView(
      this.viewTypeContactList,
      (leaf) => new ContactListView(leaf, this)
    );

    // Enforce contact file naming
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

//#region Settings

  async loadSettings() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Disabling eslint as this is an issue triggered by Obsidian's API. Triggers locally
    const raw = await this.loadData();
    const { values, migrated } = migrate(raw);
    this.settings = Object.assign({}, DEFAULT_SETTINGS, values);
    if (migrated) await this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

//#endregion

//#region Contact File

  async createNewContact(firstName: string, lastName: string): Promise<void> {
    const file = await Contact.create(this.app, this.settings, firstName, lastName);
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  isContactFile(file: TFile): boolean {
    if (this.settings.useFolder) {
      const folder = normalizePath(this.settings.folderPath);
      if (!folder) return false;
      return file.path === folder || file.path.startsWith(folder + "/");
    }

    const tag = this.settings.tag.trim().replace(/^#/, "").toLowerCase();
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
    const newPath = (folder ? folder + "/" : "") + expectedName + ".md";

    if (this.app.vault.getAbstractFileByPath(newPath)) {
      new Notice(`Contact could not be renamed to "${expectedName}": a file with that name already exists. Add a middle name or initial to disambiguate.`);
      return;
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

    if (!contact.isValid) {
      const missingFields: string[] = [];
      if (!contact.firstName) missingFields.push("firstName");
      if (!contact.lastName) missingFields.push("lastName");
      const errorEl = el.createDiv({ cls: `${this.manifest.id}-error` });
      errorEl.createEl("strong", { text: "Contact note is missing required fields: " });
      errorEl.createSpan({ text: missingFields.join(", ") });
      errorEl.createEl("p", { text: "Add these properties to the frontmatter to display this contact." });
      return;
    }

    buildContactCard(this.manifest.id, this.app, el, contact, { showDetails: true });
  }

//#endregion

//#region View

  async activateContactListView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(this.viewTypeContactList);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: this.viewTypeContactList, active: true });
      await workspace.revealLeaf(leaf);
    }
  }

  refreshContactListView() {
    for (const leaf of this.app.workspace.getLeavesOfType(this.viewTypeContactList)) {
      if (leaf.view instanceof ContactListView) {
        leaf.view.reinit();
      }
    }
  }

//#endregion
}
