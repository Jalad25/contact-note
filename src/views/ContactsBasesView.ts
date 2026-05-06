import {
  BasesOptionGroup,
  BasesPropertyId,
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
import { buildContactCard } from "../ContactNoteCard";
import { NewContactModal } from "../modals/NewContactModal";
import ContactNotePlugin, { CONTACT_CARDS_LIST_VIEW_TYPE } from "../main";

//#region Constants

const SCALAR_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "displayName",
  "title",
  "company",
  "photo"
] as const;

const LIST_FIELDS = ["email", "phone"] as const;

const DEFAULT_PROPERTY_ORDER: BasesPropertyId[] = [
  "note.firstName",
	"note.middleName",
  "note.lastName",
  "note.displayName"
];

//#endregion

//#region Bases View

export class ContactsBasesView extends BasesView {
  type = CONTACT_CARDS_LIST_VIEW_TYPE;
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
        this.config.set("order", DEFAULT_PROPERTY_ORDER);
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

    this.containerEl.toggleClass(`${this.plugin.manifest.id}-card-condensed`, condensed);

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

        for (const field of SCALAR_FIELDS) {
          fm[field] = readScalar(entry.getValue(`note.${field}`));
        }
        for (const field of LIST_FIELDS) {
          fm[field] = readStringList(entry.getValue(`note.${field}`));
        }

        // socials is an array of single key objects. ObjectValue has no key enumeration
        // in the public API, so read this one field straight from the metadata cache
        const cached = this.plugin.app.metadataCache.getFileCache(entry.file);
        fm.socials = cached?.frontmatter?.socials;

        const contact = Contact.fromCache(entry.file, fm);

				// Build contact card
        buildContactCard(
          this.plugin.manifest.id,
          this.plugin.app,
          groupContainer,
          contact,
          { condensed, clickable: true, showDetails, lastNameFirstOverride: lastNameFirst },
        );
      }
    }
  }

  onunload(): void {
    this.containerEl.remove();
  }

  /* Bases' native New button creates a file using the visible columns'
     frontmatter at the vault root, wrong location and wrong shape for a
     contact. It cannot be intercepted (createFileForView is a helper for views
     to call, not a hook Bases calls on us), so the native button is hidden
     via CSS (scoped to leaves containing the plugin's bases' view) 
		 and the plugin injects its own */
  private newButtonInjected = false;

  private injectNewButton(): void {
    if (this.newButtonInjected) return;

    const native = activeDocument.querySelector<HTMLElement>(
      `.workspace-leaf:has(.${this.plugin.manifest.id}-bases-view) .bases-toolbar-new-item-menu`,
    );
    if (!native) return;

    const ourBtn = native.createEl("button", {
      cls: `${this.plugin.manifest.id}-bases-view-new-btn clickable-icon`,
      attr: { "aria-label": "New contact" }
    });
    setIcon(ourBtn, "lucide-plus");
		ourBtn.createSpan({ cls: "text-button-label", text: "New"});
    ourBtn.addEventListener("click", () => new NewContactModal(this.plugin).open());

    this.newButtonInjected = true;
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
