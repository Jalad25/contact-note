import {
  CachedMetadata,
  ItemView,
  Menu,
  setIcon,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import ContactNotePlugin, { CONTACT_NOTE_LIST_VIEW_TYPE } from "../main";
import { Contact } from "../Contact";
import { buildContactCard } from "../ContactCard";
import { NewContactNoteModal } from "../modals/NewContactNoteModal";
import { EditViewFilterModal } from "../modals/EditViewFilterModal";

//#region Types/Objects/Interfaces

export interface FrontmatterFilter {
  property: string;
  operator: "contains" | "is" | "exists" | "is true" | "is false";
  value: string;
}

export interface ContactsViewOptions {
  condensedList: boolean;
  lastNameFirst: boolean;
  showContactDetails: boolean;
  viewFilters: FrontmatterFilter[];
}

//#endregion

//#region Constants

export const DEFAULT_VIEW_OPTIONS: ContactsViewOptions = {
  condensedList: true,
  lastNameFirst: true,
  showContactDetails: false,
  viewFilters: [],
};

//#endregion

//#region Contacts View

export class ContactsView extends ItemView {
  plugin: ContactNotePlugin;
  private contacts = new Map<string, Contact>();
  private searchQuery = "";
  private showSearch = false;
  private letterFilter = "";

  constructor(leaf: WorkspaceLeaf, plugin: ContactNotePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CONTACT_NOTE_LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.plugin.configuration.viewName || "Contacts";
  }

  getIcon(): string {
    return "book-user";
  }

  onOpen(): Promise<void> {
    this.initContacts();

		//#region Events

		/* File change events */
    this.registerEvent(
      this.app.metadataCache.on("changed", (file: TFile, _data: string, cache: CachedMetadata) => {
        const isContact = this.plugin.isContactFile(file);
        const wasContact = this.contacts.has(file.path);

        if (!isContact) {
          if (wasContact) {
            this.contacts.delete(file.path);
            this.renderCards();
          }
          return;
        }

        const fm = cache.frontmatter;
        if (!fm) {
          if (wasContact) {
            this.contacts.delete(file.path);
            this.renderCards();
          }
          return;
        }

        const existing = this.contacts.get(file.path);
        if (existing) {
          existing.update(fm, this.plugin.contactNote);
        } else {
          this.contacts.set(file.path, Contact.fromCache(file, fm, this.plugin.contactNote));
        }
        this.renderCards();
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.contacts.delete(file.path)) {
          this.renderCards();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.contacts.delete(oldPath);
        if (!(file instanceof TFile) || !this.plugin.isContactFile(file)) return;
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) return;
        this.contacts.set(file.path, Contact.fromCache(file, fm, this.plugin.contactNote));
        this.renderCards();
      })
    );

		// Configuration Events
		this.registerEvent(
			this.plugin.events.on("configuration-changed", () => {
				this.reinit();
			})
		);

		//#endregion

    this.render();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    return Promise.resolve();
  }

  private reinit(): void {
    this.initContacts();
    this.render();
  }

  private openOptionsMenu(e: MouseEvent): void {
    const menu = new Menu();

		// condensedList
    menu.addItem((item) =>
      item
        .setTitle("Condensed")
        .setChecked(this.plugin.configuration.condensedList)
        .onClick(async () => {
          this.plugin.configuration.condensedList = !this.plugin.configuration.condensedList;
          if (this.plugin.configuration.condensedList) {
            this.plugin.configuration.showContactDetails = false;
          }
          await this.plugin.saveConfiguration();
        }),
    );

		// showContactDetails
    if (!this.plugin.configuration.condensedList) {
      menu.addItem((item) =>
        item
          .setTitle("Show contact details")
          .setChecked(this.plugin.configuration.showContactDetails)
          .onClick(async () => {
            this.plugin.configuration.showContactDetails = !this.plugin.configuration.showContactDetails;
            await this.plugin.saveConfiguration();
          }),
      );
    }

		// lastNameFirst
    menu.addItem((item) =>
      item
        .setTitle("Last name first")
        .setChecked(this.plugin.configuration.lastNameFirst)
        .onClick(async () => {
          this.plugin.configuration.lastNameFirst = !this.plugin.configuration.lastNameFirst;
          await this.plugin.saveConfiguration();
        }),
    );

    menu.addSeparator();

		// viewFilters
    menu.addItem((item) =>
      item
        .setTitle("Edit view filter…")
        .setIcon("filter")
        .onClick(() => new EditViewFilterModal(this.plugin).open()),
    );

    menu.showAtMouseEvent(e);
  }

  private initContacts(): void {
    this.contacts.clear();
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.plugin.isContactFile(file)) continue;
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm) continue;
      this.contacts.set(file.path, Contact.fromCache(file, fm, this.plugin.contactNote));
    }
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass(`${this.plugin.manifest.id}-view`);
    if (this.plugin.configuration.condensedList) {
      container.addClass(`${this.plugin.manifest.id}-cards-condensed`);
    } else {
      container.removeClass(`${this.plugin.manifest.id}-cards-condensed`);
    }

    //#region Header

    const headerEl = container.createDiv({ cls: `${this.plugin.manifest.id}-view-header` });

		// Title
    headerEl.createEl("h1", {
      cls: `${this.plugin.manifest.id}-view-title`,
      text: this.plugin.configuration.viewName || "Contacts",
    });

		// Buttons Container
    const btnGroup = headerEl.createDiv({ cls: `${this.plugin.manifest.id}-view-header-btns` });

		//#endregion

		//#region Buttons

		/* New Contact Button */
    const newBtn = btnGroup.createEl("button", { cls: `${this.plugin.manifest.id}-view-header-btn clickable-icon` });
    setIcon(newBtn, "user-plus");
    newBtn.setAttribute("aria-label", "New contact");
    newBtn.addEventListener("click", () => new NewContactNoteModal(this.plugin).open());

    /* Search Button */
    const searchBtn = btnGroup.createEl("button", { cls: `${this.plugin.manifest.id}-view-header-btn clickable-icon` });
    setIcon(searchBtn, "search");
    searchBtn.setAttribute("aria-label", "Search contacts");
    if (this.showSearch) searchBtn.addClass("is-active");
    searchBtn.addEventListener("click", () => {
      this.showSearch = !this.showSearch;
      if (!this.showSearch) this.searchQuery = "";
      this.render();
    });

    /* View Options Menu */
    const menuBtn = btnGroup.createEl("button", { cls: `${this.plugin.manifest.id}-view-header-btn clickable-icon` });
    setIcon(menuBtn, "more-vertical");
    menuBtn.setAttribute("aria-label", "View options");
    menuBtn.addEventListener("click", (e) => this.openOptionsMenu(e));

		//#endregion

		// Search Input
    if (this.showSearch) {
      const searchInput = container.createEl("input", {
        cls: `${this.plugin.manifest.id}-view-search`,
        attr: { type: "text", placeholder: "Search contacts…" },
      });
      searchInput.value = this.searchQuery;
      searchInput.addEventListener("input", () => {
        this.searchQuery = searchInput.value;
        this.renderCards();
      });
      searchInput.focus();
    }

    /* Alphabet Filter Bar */
		container.createEl("hr");
    const alphaBar = container.createDiv({ cls: `${this.plugin.manifest.id}-view-alpha-bar` });
    const alphaBtns = alphaBar.createDiv({ cls: `${this.plugin.manifest.id}-view-alpha-btns` });
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const btn = alphaBtns.createDiv({ cls: `clickable-icon ${this.plugin.manifest.id}-view-alpha-btn` });
      btn.setText(letter);
      if (this.letterFilter === letter) btn.addClass("is-active");
      btn.addEventListener("click", () => {
        this.letterFilter = this.letterFilter === letter ? "" : letter;
        this.render();
      });
    }
		container.createEl("hr");

    this.renderCards();
  }

  private renderCards(): void {
    const container = this.contentEl;

		// Clear DOM of cards
    container.querySelectorAll(`.${this.plugin.manifest.id}-card, .${this.plugin.manifest.id}-empty`)
      .forEach((el) => el.remove());

    const query = this.searchQuery.toLowerCase().trim();
    const letter = this.letterFilter;

		/* Apply view filters */

    const viewFilters = this.plugin.configuration.viewFilters.filter(
      (f) => f.property.trim() !== ""
    );

		// Run through filters and sort
    const filtered = [...this.contacts.values()]
      .filter((contact) => {
        if (viewFilters.some((f) => !matchesFilter(contact.rawFrontmatter, f))) return false;
        if (letter && !contact.lastName.toUpperCase().startsWith(letter)) return false;
        if (!query) return true;
        return [contact.firstName, contact.lastName, contact.middleName, contact.displayName]
          .some((v) => v.toLowerCase().includes(query));
      })
      .sort(compareContacts);

		// Show empty message if no contacts
    if (filtered.length === 0) {
      container.createEl("p", {
        cls: `${this.plugin.manifest.id}-empty`,
        text: query || letter ? "No contacts match your filter." : "No contact notes found.",
      });
      return;
    }

		/* Get options */
    const condensed = this.plugin.configuration.condensedList;
    const lastNameFirst = this.plugin.configuration.lastNameFirst;
		const showDetails = this.plugin.configuration.showContactDetails;

		// Build contact cards
    for (const contact of filtered) {
      buildContactCard(this.plugin.manifest.id, this.plugin.app, this.plugin.contactNote, container, contact, { condensed, clickable: true, showDetails: showDetails, lastNameFirst: lastNameFirst });
    }
  }
}

//#endregion

//#region Utilities

function compareContacts(a: Contact, b: Contact): number {
  const aValid = !!(a.firstName && a.lastName);
  const bValid = !!(b.firstName && b.lastName);
  if (aValid !== bValid) return aValid ? -1 : 1;
  if (!aValid) return 0;
  return `${a.lastName} ${a.firstName}`
    .toLowerCase()
    .localeCompare(`${b.lastName} ${b.firstName}`.toLowerCase());
}

function matchesFilter(fm: Record<string, unknown>, filter: FrontmatterFilter): boolean {
  const raw = fm[filter.property];

  switch (filter.operator) {
    case "exists":
      return raw !== undefined && raw !== null && raw !== "";
    case "is true":
      return raw === true || String(raw).toLowerCase() === "true";
    case "is false":
      return raw === false || String(raw).toLowerCase() === "false";
    default: {
      if (raw === undefined || raw === null) return false;
      const val = filter.value.toLowerCase();
      if (Array.isArray(raw)) {
        return raw.some((item) => {
          const s = String(item).toLowerCase();
          return filter.operator === "is" ? s === val : s.includes(val);
        });
      }
      if (typeof raw !== "string") return false;
      const s = String(raw).toLowerCase();
      return filter.operator === "is" ? s === val : s.includes(val);
    }
  }
}

//#endregion
