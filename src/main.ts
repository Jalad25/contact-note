import {
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  TFile,
	Events
} from "obsidian";
import { ContactsView, ContactsViewOptions, DEFAULT_VIEW_OPTIONS } from "./views/ContactsView";
import { ContactNoteSettingTab, ContactNoteSettings, DEFAULT_SETTINGS } from "./ContactNoteSettingTab";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactCard";
import { NewContactsBaseModal } from "./modals/NewContactsBaseModal";
import { AppendContactsBaseViewModal } from "./modals/AppendContactsBaseViewModal";
import { ContactsBasesView } from "./views/ContactsBasesView";
import { ContactNote } from "./ContactNote";

//#region Constants

export const CONTACT_NOTE_LIST_VIEW_TYPE = "contact-note-list";

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
  contactNote = new ContactNote();
	events = new Events();
  private renamingFiles = new Set<string>();

  async onload() {
    // Configuration
    await this.loadSettings();

		// Settings Tab
    this.addSettingTab(new ContactNoteSettingTab(this.app, this));

		//#region Contacts Views

    // View
    this.registerView(
      CONTACT_NOTE_LIST_VIEW_TYPE,
      (leaf) => new ContactsView(leaf, this)
    );

    // Bases view
    this.registerBasesView(
			CONTACT_NOTE_LIST_VIEW_TYPE, {
				name: "Contacts",
				icon: "book-user",
				factory: (controller, scrollEl) =>
					new ContactsBasesView(controller, scrollEl, this),
				options: ContactsBasesView.getViewOptions
			}
		);

		//#endregion

		//#region Events

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

		//#endregion

		//#region Ribbon Menu and Commands

		/* Ribbon Menu */
    this.addRibbonIcon("book-user", "Open contacts view in panel", () => {
      void this.activateContactsView();
    });

    /* Commands */
    this.addCommand({
      id: "open-contacts-view",
      name: "Open contacts view in panel",
      callback: () => { void this.activateContactsView(); },
    });

    this.addCommand({
      id: "create-contacts-base",
      name: "Create new base with contacts view",
      callback: () => new NewContactsBaseModal(this).open(),
    });

    this.addCommand({
      id: "add-contacts-base-view",
      name: "Add contacts view to base",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "base") return false;
        if (checking) return true;
        new AppendContactsBaseViewModal(this, file).open();
        return true;
      },
    });

		//#endregion

    // Contact Note Card Processing
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!el.classList.contains("mod-frontmatter")) return;
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      if (!(file instanceof TFile)) return;
      if (!this.isContactFile(file)) return;
      if (!ctx.frontmatter) return;
      const contact = Contact.fromCache(file, ctx.frontmatter as Record<string, unknown>, this.contactNote);
      buildContactCard(this.manifest.id, this.app, this.contactNote, el, contact, { showDetails: true, lastNameFirst: false });
    });
  }

//#region Configuration

  async loadSettings() {
    const raw: unknown = await this.loadData();

    /* Remove properties from data.json object that are no longer used */
    const known = new Set(Object.keys(DEFAULT_CONFIGURATION));
    const filtered: Record<string, unknown> = {};
    let droppedAny = false;
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (known.has(k)) filtered[k] = v;
        else droppedAny = true;
      }
    }

    this.configuration = Object.assign({}, DEFAULT_CONFIGURATION, filtered);
    this.contactNote.applyCustomizations(this.configuration.frontmatterCustomizations);
    if (droppedAny) await this.saveConfiguration();
  }

  async saveConfiguration() {
    await this.saveData(this.configuration);
    this.contactNote.applyCustomizations(this.configuration.frontmatterCustomizations);

		//Re-load anything that updates after a change is made
  	this.events.trigger("configuration-changed");
  }

//#endregion

//#region Contact File

  isContactFile(file: TFile): boolean {
		// In folder
    if (this.configuration.useFolder) {
      const folder = normalizePath(this.configuration.folderPath);
      if (!folder || folder === "/") return false;
      return file.path === folder || file.path.startsWith(folder + "/");
    }

		/* Has tag */
    const tag = this.configuration.tag.trim().replace(/^#/, "").toLowerCase();
    if (!tag) return false;

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return false;

    const tags: string[] = [];

    const fmTags: unknown = cache.frontmatter?.tags;
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

    const readField = (key: string): string => {
      const field = this.contactNote.getField(key);
      if (!field) return "";
      const raw = frontmatter[this.contactNote.getReadKey(field)];
      return raw !== null && typeof raw === "string" ? String(raw).trim() : "";
    };

    const firstName = readField("firstName");
    const middleName = readField("middleName");
    const lastName = readField("lastName");

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

//#endregion

//#region View

  async activateContactsView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(CONTACT_NOTE_LIST_VIEW_TYPE);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: CONTACT_NOTE_LIST_VIEW_TYPE, active: true });
      await workspace.revealLeaf(leaf);
    }
  }

//#endregion

}
