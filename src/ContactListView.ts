import { CachedMetadata, ItemView, Modal, Setting, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import ContactNotePlugin, { FrontmatterFilter } from "./main";
import { VIEW_TYPE_CONTACT_LIST } from "./main";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactCard";

//#region Contact List View

export class ContactListView extends ItemView {
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
    return VIEW_TYPE_CONTACT_LIST;
  }

  getDisplayText(): string {
    return this.plugin.settings.listTitle || "Contacts";
  }

  getIcon(): string {
    return "book-user";
  }

  async onOpen(): Promise<void> {
    this.initContacts();

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
          existing.update(fm);
        } else {
          this.contacts.set(file.path, Contact.fromCache(file, fm));
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
        this.contacts.set(file.path, Contact.fromCache(file, fm));
        this.renderCards();
      })
    );

    this.render();
  }

  async onClose(): Promise<void> {}

  reinit(): void {
    this.initContacts();
    this.render();
  }

  private initContacts(): void {
    this.contacts.clear();
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.plugin.isContactFile(file)) continue;
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm) continue;
      this.contacts.set(file.path, Contact.fromCache(file, fm));
    }
  }

  render(): void {
    const container = this.contentEl as HTMLElement;
    container.empty();
    container.addClass("contact-note-list-view");
    if (this.plugin.settings.condensedList) {
      container.addClass("contact-note-list-condensed");
    } else {
      container.removeClass("contact-note-list-condensed");
    }

    // Header
    const headerEl = container.createDiv({ cls: "contact-note-list-header" });
    headerEl.createEl("h1", {
      cls: "contact-note-list-title",
      text: this.plugin.settings.listTitle || "Contacts",
    });
    const btnGroup = headerEl.createDiv({ cls: "contact-note-header-btns" });

    const newBtn = btnGroup.createEl("button", { cls: "contact-note-header-btn" });
    setIcon(newBtn, "user-plus");
    newBtn.setAttribute("aria-label", "New contact");
    newBtn.addEventListener("click", () => new NewContactModal(this.plugin).open());

    // Search
    const searchBtn = btnGroup.createEl("button", { cls: "contact-note-header-btn" });
    setIcon(searchBtn, "search");
    searchBtn.setAttribute("aria-label", "Search contacts");
    if (this.showSearch) searchBtn.addClass("is-active");
    searchBtn.addEventListener("click", () => {
      this.showSearch = !this.showSearch;
      if (!this.showSearch) this.searchQuery = "";
      this.render();
    });
  
    if (this.showSearch) {
      const searchInput = container.createEl("input", {
        cls: "contact-note-search",
        attr: { type: "text", placeholder: "Search contacts…" },
      });
      searchInput.value = this.searchQuery;
      searchInput.addEventListener("input", () => {
        this.searchQuery = searchInput.value;
        this.renderCards();
      });
      searchInput.focus();
    }

    // Alphabet filter bar
    const alphaBar = container.createDiv({ cls: "nav-header contact-note-alpha-bar" });
    const alphaBtns = alphaBar.createDiv({ cls: "nav-buttons-container" });

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const btn = alphaBtns.createDiv({ cls: "clickable-icon contact-note-alpha-btn" });
      btn.setText(letter);
      if (this.letterFilter === letter) btn.addClass("is-active");
      btn.addEventListener("click", () => {
        this.letterFilter = this.letterFilter === letter ? "" : letter;
        this.render();
      });
    }

    this.renderCards();
  }

  private renderCards(): void {
    const container = this.contentEl as HTMLElement;
    container.querySelectorAll(".contact-note-card, .contact-note-list-empty")
      .forEach((el) => el.remove());

    const query = this.searchQuery.toLowerCase().trim();
    const letter = this.letterFilter;

    const defaultFilters = this.plugin.settings.defaultFilters.filter(
      (f) => f.property.trim() !== ""
    );

    const filtered = [...this.contacts.values()]
      .filter((contact) => {
        if (defaultFilters.some((f) => !matchesFilter(contact.rawFrontmatter, f))) return false;
        if (letter && !contact.lastName.toUpperCase().startsWith(letter)) return false;
        if (!query) return true;
        return [contact.firstName, contact.lastName, contact.middleName, contact.resolvedDisplayName]
          .some((v) => v.toLowerCase().includes(query));
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    if (filtered.length === 0) {
      container.createEl("p", {
        cls: "contact-note-list-empty",
        text: query || letter ? "No contacts match your filter." : "No contact notes found.",
      });
      return;
    }

    const condensed = this.plugin.settings.condensedList;
    const lastNameFirst = this.plugin.settings.lastNameFirst;
    for (const contact of filtered) {
      const nameOverride = lastNameFirst
        ? [contact.lastName + ",", contact.firstName, contact.middleName].filter(Boolean).join(" ")
        : undefined;
      buildContactCard(this.plugin.app, container, contact, { condensed, clickable: true, showDetails: false, nameOverride });
    }
  }
}

//#endregion

//#region New Contact Modal

export class NewContactModal extends Modal {
  plugin: ContactNotePlugin;

  constructor(plugin: ContactNotePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "New contact" });

    let firstName = "";
    let lastName = "";

    new Setting(contentEl)
      .setName("First name")
      .addText((text) =>
        text.onChange((value) => { firstName = value; })
      );

    new Setting(contentEl)
      .setName("Last name")
      .addText((text) =>
        text.onChange((value) => { lastName = value; })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Create")
          .setCta()
          .onClick(() => {
            this.close();
            this.plugin.createNewContact(firstName.trim(), lastName.trim());
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

//#endregion

//#region Utilities

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
      const s = String(raw).toLowerCase();
      return filter.operator === "is" ? s === val : s.includes(val);
    }
  }
}

//#endregion