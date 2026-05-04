import { App, PluginSettingTab, Setting } from "obsidian";
import ContactNotePlugin, { FrontmatterFilter } from "./main";

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
      .setDesc("When enabled, each card in the contact list shows only the photo and name.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.condensedList).onChange(async (value) => {
          this.plugin.settings.condensedList = value;
          await this.plugin.saveSettings();
          this.plugin.refreshContactListView();
        })
      );

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