import {
  BasesOptionGroup,
  BasesToggleOption,
  BasesView,
  BasesViewConfig,
  ListValue,
  NullValue,
  QueryController,
  setIcon,
  Value
} from "obsidian";
import { Contact } from "../Contact";
import { buildContactCard } from "../ContactCard";
import { getDefaultPropertyOrder } from "../ContactsBase";
import { NewContactNoteModal } from "../modals/NewContactNoteModal";
import ContactNotePlugin, { CONTACT_NOTE_LIST_VIEW_TYPE } from "../main";

//#region Bases View

export class ContactsBasesView extends BasesView {
  type = CONTACT_NOTE_LIST_VIEW_TYPE;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;
  private seeded = false;

  constructor(
    controller: QueryController,
    scrollEl: HTMLElement,
    private plugin: ContactNotePlugin,
  ) {
    super(controller);
    this.scrollEl = scrollEl;
    this.containerEl = scrollEl.createDiv({
      cls: `${plugin.manifest.id}-bases-view`
    });
  }

  onDataUpdated(): void {
		// Hide obsidian bases + New and show plugin version instead
    this.injectNewButton();

    // Tag the bases header sibling so styles can target it
    this.tagHeader();

		// Empty container
    this.containerEl.empty();

    // Seed default property order on first run for fresh views.
    // Empty or just ["file.name"] means the user hasn't customized the panel.
    if (!this.seeded) {
      this.seeded = true;
      const order = this.config.getOrder();
      const isFreshView =
        order.length === 0 ||
        (order.length === 1 && order[0] === "file.name");
      if (isFreshView) {
        this.config.set("order", getDefaultPropertyOrder(this.plugin.contactNote));
      }
    }

		// Get display options
    const condensed = (this.config.get("condensed") as boolean) ?? true;
    let showDetails = (this.config.get("showDetails") as boolean) ?? false;
    const lastNameFirst = (this.config.get("lastNameFirst") as boolean) ?? true;

		// Hide showDetails if condensed
    if (condensed && showDetails) {
      this.config.set("showDetails", false);
      showDetails = false;
    }

    this.containerEl.toggleClass(`${this.plugin.manifest.id}-cards-condensed`, condensed);

    if (this.data.data.length === 0) {
      this.containerEl.createEl("p", {
        cls: `${this.plugin.manifest.id}-empty`,
        text: "No contacts match."
      });
      return;
    }

    // Iterate Bases' grouped data. If the user hasn't configured a group-by,
    // groupedData returns a single group with no key (hasKey() === false).
    // Sort within each group is already applied by Bases per the user's config
    for (const group of this.data.groupedData) {
      const showHeader = group.hasKey();
      if (showHeader) {
        this.containerEl.createEl("h3", {
          cls: `${this.plugin.manifest.id}-bases-view-group-header`,
          text: group.key?.toString() || "(none)",
        });
      }

      const groupContainer = showHeader
        ? this.containerEl.createDiv({ cls: `${this.plugin.manifest.id}-bases-view-group` })
        : this.containerEl;

      for (const entry of group.entries) {
        const fm: Record<string, unknown> = {};

        for (const field of this.plugin.contactNote.getFields()) {
          if (field.kind === "socials") continue;
          const readKey = this.plugin.contactNote.getReadKey(field);
          const raw = entry.getValue(`note.${readKey}`);
          fm[readKey] = field.kind === "scalar" ? readScalar(raw) : readStringList(raw);
        }

        /* socials is an array of single key objects. ObjectValue has no key
					 enumeration in the public API, so read this one field straight from the
					 metadata cache */
        const socialsField = this.plugin.contactNote.getField("socials");
        const socialsKey = socialsField ? this.plugin.contactNote.getReadKey(socialsField) : "socials";
        const cached = this.plugin.app.metadataCache.getFileCache(entry.file);
        fm[socialsKey] = cached?.frontmatter?.[socialsKey];

        const contact = Contact.fromCache(entry.file, fm, cached?.frontmatterLinks, this.plugin.contactNote);

				// Build contact card
        buildContactCard(
          this.plugin.manifest.id,
          this.plugin.app,
          this.plugin.contactNote,
          groupContainer,
          contact,
          { condensed, clickable: true, showDetails, lastNameFirst: lastNameFirst },
        );
      }
    }
  }

  onunload(): void {
    this.containerEl.remove();

    // Remove the injected new button and the header tag so other Bases views
    // in this leaf get the native chrome back.
    const leaf = this.scrollEl.closest(".workspace-leaf");
    leaf?.querySelector(`.${this.plugin.manifest.id}-bases-view-new-btn`)?.remove();
    leaf?.querySelector(`.${this.plugin.manifest.id}-bases-view-header`)
      ?.removeClass(`${this.plugin.manifest.id}-bases-view-header`);
  }

  /* Bases' native New button creates a file using the visible columns'
     frontmatter at the vault root, wrong location and wrong shape for a
     contact. It cannot be intercepted (createFileForView is a helper for views
     to call, not a hook Bases calls on us), so the native button is hidden
     via CSS (scoped to leaves containing the plugin's bases' view)
		 and the plugin injects its own */
  private injectNewButton(): void {
    const native = activeDocument.querySelector<HTMLElement>(
      `.workspace-leaf:has(.${this.plugin.manifest.id}-bases-view) .bases-toolbar-new-item-menu`,
    );
    if (!native) return;
    if (native.querySelector(`:scope > .${this.plugin.manifest.id}-bases-view-new-btn`)) return;

    const ourBtn = native.createEl("button", {
      cls: `${this.plugin.manifest.id}-bases-view-new-btn clickable-icon`,
      attr: { "aria-label": "New contact" }
    });
    setIcon(ourBtn, "lucide-plus");
		ourBtn.createSpan({ cls: "text-button-label", text: "New"});
    ourBtn.addEventListener("click", () => new NewContactNoteModal(this.plugin).open());
  }

  private tagHeader(): void {
    const cls = `${this.plugin.manifest.id}-bases-view-header`;
    let prev = this.scrollEl.previousElementSibling;
    while (prev && !(prev.instanceOf(HTMLElement) && prev.matches("div.bases-header"))) {
      prev = prev.previousElementSibling;
    }
    if (!prev?.instanceOf(HTMLElement)) return;
    if (prev.classList.contains(cls)) return;
    prev.addClass(cls);
  }

	// Bases Options
  static getViewOptions(this: void, config: BasesViewConfig) {
    return [
      {
        displayName: "Display",
        type: "group",
        items: [
          {
            displayName: "Condensed",
            type: "toggle",
            key: "condensed",
            default: true
          },
          {
            displayName: "Show contact details",
            type: "toggle",
            key: "showDetails",
            default: false,
            shouldHide: () => config.get("condensed") === true
          },
          {
            displayName: "Last name first",
            type: "toggle",
            key: "lastNameFirst",
            default: true
          }
        ] as BasesToggleOption[]
      } as BasesOptionGroup<BasesToggleOption>
    ];
  }
}

//#endregion

//#region Utilities

function readScalar(v: Value | null): string {
  if (v == null || v instanceof NullValue) return "";
  return v.toString();
}

function readStringList(v: Value | null): string[] {
  if (v == null || v instanceof NullValue) return [];
  if (v instanceof ListValue) {
    const out: string[] = [];
    const len = v.length();
    for (let i = 0; i < len; i++) {
      const item = v.get(i);
      if (item instanceof NullValue) continue;
      const s = item.toString();
      if (s) out.push(s);
    }
    return out;
  }
  const s = v.toString();
  return s ? [s] : [];
}

//#endregion
