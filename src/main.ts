import {
  MarkdownView,
  normalizePath,
  Notice,
  Plugin,
  TFile,
  MarkdownPostProcessorContext,
} from "obsidian";
import { ContactListView } from "./ContactListView";
import { ContactNoteSettingTab } from "./ContactNoteSettingTab";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactCard";

export const VIEW_TYPE_CONTACT_LIST = "contact-note-list";

export interface FrontmatterFilter {
  property: string;
  operator: "contains" | "is" | "exists" | "is true" | "is false";
  value: string;
}

export interface ContactNoteSettings {
  useFolder: boolean;
  folderPath: string;
  tag: string;
  listTitle: string;
  condensedList: boolean;
  lastNameFirst: boolean;
  defaultFilters: FrontmatterFilter[];
}

export const DEFAULT_SETTINGS: ContactNoteSettings = {
  useFolder: true,
  folderPath: "Contacts",
  tag: "contact",
  listTitle: "Contacts",
  condensedList: true,
  lastNameFirst: true,
  defaultFilters: [],
};

export default class ContactNotePlugin extends Plugin {
  settings!: ContactNoteSettings;
  private renamingFiles = new Set<string>();

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
      VIEW_TYPE_CONTACT_LIST,
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
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass("contact-note");
          return;
        }
        view.contentEl.querySelector(".markdown-reading-view")?.addClass("contact-note");
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file || !this.isContactFile(view.file)) {
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass("contact-note");
          return;
        }
        view.contentEl.querySelector(".markdown-reading-view")?.addClass("contact-note");
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file || !this.isContactFile(view.file)) {
          view?.contentEl.querySelector(".markdown-reading-view")?.removeClass("contact-note");
          return;
        };
        view.contentEl.querySelector(".markdown-reading-view")?.addClass("contact-note");
      })
    );

  }

//#region Settings

  async loadSettings() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Disabling eslint as this is an issue triggered by Obsidian's API. Triggers locally
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

//#endregion

//#region Contact File

  async createNewContact(firstName: string, lastName: string): Promise<void> {
    const folder = this.settings.useFolder
      ? normalizePath(this.settings.folderPath)
      : "";

    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder);
    }

    const baseName = [firstName, lastName].filter((s) => s.trim()).join(" ") || "New Contact";
    let name = baseName;
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(`${folder ? folder + "/" : ""}${name}.md`)) {
      name = `${baseName} ${counter++}`;
    }
    const filePath = `${folder ? folder + "/" : ""}${name}.md`;

    const tagLine = !this.settings.useFolder && this.settings.tag.trim()
      ? `tags:\n  - ${this.settings.tag.trim().replace(/^#/, "")}\n`
      : "";
    const aliasLines = firstName
      ? ["aliases:", `  - ${firstName}`]
      : ["aliases:"];

    const lines = [
      "---",
      `firstName: ${firstName}`,
      "middleName: ",
      `lastName: ${lastName}`,
      "displayName: ",
      "company: ",
      "title: ",
      "email: ",
      "phone: ",
      "photo: ",
      "socials:",
      "  - twitter: ",
      "  - instagram: ",
      "  - linkedin: ",
      "  - github: ",
      "  - facebook: ",
      "  - youtube: ",
      "  - tiktok: ",
      "  - bluesky: ",
      "  - reddit: ",
      "  - discord: ",
      "  - telegram: ",
      "  - twitch: ",
      "  - snapchat: ",
      "  - pinterest: ",
      ...aliasLines,
      ...(tagLine ? tagLine.replace(/\s+$/, "").split("\n") : []),
      "---",
      "",
    ];

    const file = await this.app.vault.create(filePath, lines.join("\n"));
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  isContactFile(file: TFile): boolean {
    if (this.settings.useFolder) {
      const folder = normalizePath(this.settings.folderPath);
      if (!folder) return false;
      console.log(file.path === folder || file.path.startsWith(folder + "/"));
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

    console.log(tags.includes(tag));
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
      const errorEl = el.createDiv({ cls: "contact-note-error" });
      errorEl.createEl("strong", { text: "Contact note is missing required fields: " });
      errorEl.createSpan({ text: missingFields.join(", ") });
      errorEl.createEl("p", { text: "Add these properties to the frontmatter to display this contact." });
      return;
    }

    buildContactCard(this.app, el, contact, { showDetails: true });
  }

//#endregion

//#region View

  async activateContactListView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_CONTACT_LIST);
    if (existing.length > 0) {
      await workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CONTACT_LIST, active: true });
      await workspace.revealLeaf(leaf);
    }
  }

  refreshContactListView() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTACT_LIST)) {
      if (leaf.view instanceof ContactListView) {
        leaf.view.reinit();
      }
    }
  }

//#endregion
}
