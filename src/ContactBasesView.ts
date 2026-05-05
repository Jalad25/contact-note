import {
  BasesOptionGroup,
  BasesToggleOption,
  BasesView,
  BasesViewConfig,
  ListValue,
  NullValue,
  QueryController,
  Value
} from "obsidian";
import { Contact } from "./Contact";
import { buildContactCard } from "./ContactCard";
import ContactNotePlugin, { CONTACT_CARDS_LIST_VIEW_TYPE } from "./main";

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

//#endregion

//#region Bases View

export class ContactBasesView extends BasesView {
  static readonly liveViews = new Set<ContactBasesView>();

  type = CONTACT_CARDS_LIST_VIEW_TYPE;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;

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
    ContactBasesView.liveViews.add(this);
  }

  onDataUpdated(): void {
    this.containerEl.empty();

    const condensed = (this.config.get("condensed") as boolean) ?? true;
    let showDetails = (this.config.get("showDetails") as boolean) ?? false;
    const lastNameFirst = (this.config.get("lastNameFirst") as boolean) ?? true;

    if (condensed && showDetails) {
      this.config.set("showDetails", false);
      showDetails = false;
    }

    this.containerEl.toggleClass(`${this.plugin.manifest.id}-list-condensed`, condensed);

    if (this.data.data.length === 0) {
      this.containerEl.createEl("p", {
        cls: `${this.plugin.manifest.id}-list-empty`,
        text: "No contacts match.",
      });
      return;
    }

		const filteredData = this.data.data.filter((f) => {
			return this.plugin.isContactFile(f.file);
		});

    for (const entry of filteredData) {
      const fm: Record<string, unknown> = {};

      for (const field of SCALAR_FIELDS) {
        fm[field] = readScalar(entry.getValue(`note.${field}`));
      }
      for (const field of LIST_FIELDS) {
        fm[field] = readStringList(entry.getValue(`note.${field}`));
      }

      // socials is array-of-single-key-objects; ObjectValue has no key enumeration
      // in the public API, so read this one field straight from the metadata cache.
      const cached = this.plugin.app.metadataCache.getFileCache(entry.file);
      fm.socials = cached?.frontmatter?.socials;

      const contact = Contact.fromCache(entry.file, fm);

      const nameOverride = lastNameFirst
        ? [contact.lastName + ",", contact.firstName, contact.middleName]
            .filter(Boolean)
            .join(" ")
        : undefined;

      buildContactCard(
        this.plugin.manifest.id,
        this.plugin.app,
        this.containerEl,
        contact,
        { condensed, clickable: true, showDetails, nameOverride },
      );
    }
  }

  onunload(): void {
    ContactBasesView.liveViews.delete(this);
    this.containerEl.remove();
  }

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
          } as BasesToggleOption,
          {
            displayName: "Show contact details",
            type: "toggle",
            key: "showDetails",
            default: false,
            shouldHide: () => config.get("condensed") === true
          } as BasesToggleOption,
          {
            displayName: "Last name first",
            type: "toggle",
            key: "lastNameFirst",
            default: true
          } as BasesToggleOption
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
