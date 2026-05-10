import { 
	App, 
	PluginSettingTab, 
	Setting 
} from "obsidian";
import ContactNotePlugin from "./main";
import { FolderSuggest } from "./suggesters/FolderSuggest";

//#region Types/Objects/Interfaces

export interface ContactNoteSettings {
  useFolder: boolean;
  folderPath: string;
  tag: string;
  viewName: string;
  baseFolderPath: string;
  propertyOverrides: Record<string, string>;
}

//#endregion

//#region Constants

export const DEFAULT_SETTINGS: ContactNoteSettings = {
  useFolder: true,
  folderPath: "Contacts",
  tag: "contact",
  viewName: "Contacts",
  baseFolderPath: "",
  propertyOverrides: {}
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

		// Plugin version for quick view
    containerEl.createDiv({
      attr: { style: "text-align:right;" },
      text: `Version: ${this.plugin.manifest.version}`,
    });

    /* Contact File Identification */
    new Setting(containerEl).setName("Contact file identification").setHeading();

		// useFolder
    new Setting(containerEl)
      .setName("Identify contacts by folder")
      .setDesc(
        "When enabled, any note inside the specified folder is treated as a contact note. When disabled, notes tagged with the specified tag are used instead."
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.configuration.useFolder).onChange(async (value) => {
          this.plugin.configuration.useFolder = value;
          await this.plugin.saveConfiguration();
          this.display();
        })
      );

    if (this.plugin.configuration.useFolder) {
			// folderPath
      new Setting(containerEl)
        .setName("Contacts folder path")
        .setDesc(
          'Path to the folder containing contact notes, relative to the vault root (e.g. "contacts" or "people/contacts"). Notes in subfolders are included. Cannot be root of the vault.'
        )
        .addText((text) => {
          text
            .setPlaceholder("Contacts")
            .setValue(this.plugin.configuration.folderPath)
            .onChange(async (value) => {
              this.plugin.configuration.folderPath = value;
              await this.plugin.saveConfiguration();
            });
          new FolderSuggest(this.app, text.inputEl, true);
        });
    } else {
			// tag
      new Setting(containerEl)
        .setName("Contact tag")
        .setDesc('Tag used to identify contact notes. Omit the leading "#" (e.g. "contact").')
        .addText((text) =>
          text
            .setPlaceholder("Contact")
            .setValue(this.plugin.configuration.tag)
            .onChange(async (value) => {
              this.plugin.configuration.tag = value;
              await this.plugin.saveConfiguration();
            })
        );
    }

    /* Contacts View Settings */
    new Setting(containerEl).setName("Contacts view in a panel").setHeading();

		// viewName
    new Setting(containerEl)
      .setName("View name")
      .setDesc("Name displayed at the top of the contacts view in the panel.")
      .addText((text) =>
        text
          .setPlaceholder("Contacts")
          .setValue(this.plugin.configuration.viewName)
          .onChange(async (value) => {
            this.plugin.configuration.viewName = value;
            await this.plugin.saveConfiguration();
          })
      );

    /* Bases Settings */
    new Setting(containerEl).setName("Contacts view in a base").setHeading();

		// baseFolderPath
    new Setting(containerEl)
      .setName("New base folder path")
      .setDesc("Folder where new contacts bases are created, relative to the vault root. Leave empty to place them in the vault root.")
      .addText((text) => {
        text
          .setPlaceholder("")
          .setValue(this.plugin.configuration.baseFolderPath)
          .onChange(async (value) => {
            this.plugin.configuration.baseFolderPath = value;
            await this.plugin.saveConfiguration();
          });
        new FolderSuggest(this.app, text.inputEl);
      });

    /* Frontmatter Properties Customization */
    new Setting(containerEl).setName("Frontmatter properties customization").setHeading();

    containerEl.createEl("p", {
      text:
        "Override the frontmatter property names this plugin reads from and writes to. Leave a field blank to use the default. Renaming a property does not rewrite existing notes or base files. Existing base files that reference old property names will need to be updated manually.",
      cls: "setting-item-description",
    });

    for (const field of this.plugin.contactNote.getFields()) {
      if (field.origin !== "builtin") continue;
      new Setting(containerEl)
        .setName(field.key)
        .addText((text) =>
          text
            .setPlaceholder(field.key)
            .setValue(this.plugin.configuration.propertyOverrides[field.key] ?? "")
            .onChange(async (value) => {
              const trimmed = value.trim();
              if (trimmed && trimmed !== field.key) {
                this.plugin.configuration.propertyOverrides[field.key] = trimmed;
              } else {
                delete this.plugin.configuration.propertyOverrides[field.key];
              }
              await this.plugin.saveConfiguration();
            })
        );
    }
  }
}

//#endregion
