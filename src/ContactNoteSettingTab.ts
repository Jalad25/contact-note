import { App, PluginSettingTab, Setting } from "obsidian";
import ContactNotePlugin from "./main";

//#region Types/Objects/Interfaces

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
  showContactDetails: boolean;
  defaultFilters: FrontmatterFilter[];
}

//#endregion

//#region Constants

export const CURRENT_SCHEMA_VERSION = 0;

export const DEFAULT_SETTINGS: ContactNoteSettings = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  useFolder: true,
  folderPath: "Contacts",
  tag: "contact",
  listTitle: "Contacts",
  condensedList: true,
  lastNameFirst: true,
  showContactDetails: false,
  defaultFilters: []
};

//#endregion

//#region Settings Tab

export class ContactNoteSettingTab extends PluginSettingTab {
  plugin: ContactNotePlugin;

  constructor(app: App, plugin: ContactNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();    

    containerEl.createDiv({
      attr: { style: "text-align:right;" },
      text: `Version: ${this.plugin.manifest.version}`,
    });

    // Contact Note Settings
    new Setting(containerEl).setName("Contact file identification").setHeading();

    new Setting(containerEl)
      .setName("Identify contacts by folder")
      .setDesc(
        "When enabled, any note inside the specified folder is treated as a contact note. " +
          "When disabled, notes tagged with the specified tag are used instead."
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useFolder).onChange(async (value) => {
          this.plugin.settings.useFolder = value;
          await this.plugin.saveSettings();
          this.plugin.refreshContactListView();
          this.plugin.refreshContactBasesView();
          this.display();
        })
      );

    if (this.plugin.settings.useFolder) {
      new Setting(containerEl)
        .setName("Contacts folder path")
        .setDesc(
          'Path to the folder containing contact notes, relative to the vault root (e.g. "contacts" or "people/contacts").'
        )
        .addText((text) =>
          text
            .setPlaceholder("Contacts")
            .setValue(this.plugin.settings.folderPath)
            .onChange(async (value) => {
              this.plugin.settings.folderPath = value;
              await this.plugin.saveSettings();
              this.plugin.refreshContactListView();
              this.plugin.refreshContactBasesView();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Contact tag")
        .setDesc('Tag used to identify contact notes. Omit the leading "#" (e.g. "contact").')
        .addText((text) =>
          text
            .setPlaceholder("Contact")
            .setValue(this.plugin.settings.tag)
            .onChange(async (value) => {
              this.plugin.settings.tag = value;
              await this.plugin.saveSettings();
              this.plugin.refreshContactListView();
              this.plugin.refreshContactBasesView();
            })
        );
    }

    // Contact List view settings
    new Setting(containerEl).setName("Contact list").setHeading();

    new Setting(containerEl)
      .setName("Contact list title")
      .setDesc("Title displayed at the top of the contact list view.")
      .addText((text) =>
        text
          .setPlaceholder("Contacts")
          .setValue(this.plugin.settings.listTitle)
          .onChange(async (value) => {
            this.plugin.settings.listTitle = value;
            await this.plugin.saveSettings();
            this.plugin.refreshContactListView();
          })
      );

    new Setting(containerEl)
      .setName("Show last name first in list")
      .setDesc('When enabled, names in the contact list are shown as "last, first middle" instead of the resolved display name.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.lastNameFirst).onChange(async (value) => {
          this.plugin.settings.lastNameFirst = value;
          await this.plugin.saveSettings();
          this.plugin.refreshContactListView();
        })
      );

    new Setting(containerEl)
      .setName("Condensed list view")
      .setDesc("Show only the photo and name in each card, at a smaller size. Disable to see the full card with title, company, and contact details.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.condensedList).onChange(async (value) => {
          this.plugin.settings.condensedList = value;
          if (value) this.plugin.settings.showContactDetails = false;
          await this.plugin.saveSettings();
          this.plugin.refreshContactListView();
          this.display();
        })
      );

    if (!this.plugin.settings.condensedList) {
      new Setting(containerEl)
        .setName("Show contact details")
        .setDesc("Show each contact's emails, phone numbers, and socials inside the card.")
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.showContactDetails).onChange(async (value) => {
            this.plugin.settings.showContactDetails = value;
            await this.plugin.saveSettings();
            this.plugin.refreshContactListView();
          })
        );
    }

    new Setting(containerEl).setName("Default list filters").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Contacts in the list view will be limited to those matching all conditions below.",
    });

    const filterListEl = containerEl.createDiv();
    this.renderDefaultFilters(filterListEl);

    new Setting(containerEl)
      .addButton((btn) =>
        btn.setButtonText("Add filter condition").onClick(async () => {
          this.plugin.settings.defaultFilters.push({ property: "", operator: "contains", value: "" });
          await this.plugin.saveSettings();
          this.plugin.refreshContactListView();
          this.renderDefaultFilters(filterListEl);
        })
      );
  }

  //#region Utilities

  private renderDefaultFilters(containerEl: HTMLElement): void {
    containerEl.empty();

    const filters = this.plugin.settings.defaultFilters;
    const noValueOperators: FrontmatterFilter["operator"][] = ["exists", "is true", "is false"];

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const setting = new Setting(containerEl)
        .setName("")
        .addText((text) =>
          text
            .setPlaceholder("Frontmatter key")
            .setValue(filter.property)
            .onChange(async (value) => {
              filters[i].property = value;
              await this.plugin.saveSettings();
              this.plugin.refreshContactListView();
            })
        )
        .addDropdown((dd) =>
          dd
            .addOption("contains", "Contains")
            .addOption("is", "Is")
            .addOption("exists", "Exists")
            .addOption("is true", "Is true")
            .addOption("is false", "Is false")
            .setValue(filter.operator)
            .onChange(async (value) => {
              filters[i].operator = value as FrontmatterFilter["operator"];
              if (noValueOperators.includes(filters[i].operator)) {
                filters[i].value = "";
              }
              await this.plugin.saveSettings();
              this.plugin.refreshContactListView();
              this.renderDefaultFilters(containerEl);
            })
        );

      if (!noValueOperators.includes(filter.operator)) {
        setting.addText((text) =>
          text
            .setPlaceholder("Value")
            .setValue(filter.value)
            .onChange(async (value) => {
              filters[i].value = value;
              await this.plugin.saveSettings();
              this.plugin.refreshContactListView();
            })
        );
      }

      setting.addExtraButton((btn) =>
        btn
          .setIcon("x")
          .setTooltip("Remove filter")
          .onClick(async () => {
            filters.splice(i, 1);
            await this.plugin.saveSettings();
            this.plugin.refreshContactListView();
            this.renderDefaultFilters(containerEl);
          })
      );
    }
  }

  //#endregion
}

//#endregion
