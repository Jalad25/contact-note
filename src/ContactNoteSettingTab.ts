import {
	App,
	PluginSettingTab,
	setIcon,
	Setting,
	apiVersion,
	Notice,
	requireApiVersion,
	SettingDefinitionItem
} from "obsidian";
import ContactNotePlugin, { DATA_JSON_SCHEMA_VERSION } from "./main";
import { FrontmatterCustomization } from "./ContactNote";
import { FolderSuggest } from "./suggesters/FolderSuggest";

//#region Types/Objects/Interfaces

export interface ContactNoteSettings {
  useFolder: boolean;
  folderPath: string;
  tag: string;
  viewName: string;
  baseFolderPath: string;
  showLastModified: boolean;
  frontmatterCustomizations: Record<string, FrontmatterCustomization>;
}

interface BugReport {
	pluginVersion: string;
	obsidianVersion: string;
	colorScheme: string;
	dataSchemaVersion: number;
	activeTheme: string;
	installedThemes: string[];
	enabledPlugins: string[];
	data: unknown;
}

//#endregion

//#region Constants

export const DEFAULT_SETTINGS: ContactNoteSettings = {
  useFolder: true,
  folderPath: "Contacts",
  tag: "contact",
  viewName: "Contacts",
  baseFolderPath: "",
  showLastModified: true,
  frontmatterCustomizations: {}
};

//#endregion

//#region Settings Tab

export class ContactNoteSettingTab extends PluginSettingTab {
  plugin: ContactNotePlugin;

  constructor(app: App, plugin: ContactNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;

    // Icon for menu
    this.icon = "file-user";
  }

  refresh(): void {
    if (requireApiVersion("1.13.0")) this.update(); // Declarative settings
    else if (this.containerEl.isShown()) this.display(); // Legacy settings
  }

	//#region Shared Obsidian Binding Hooks

  // Override getting value of control for key
  getControlValue(key: string): unknown {
    return (this.plugin.configuration as unknown as Record<string, unknown>)[key];
  }

	// Override persistance of control value for key
  async setControlValue(key: string, value: unknown): Promise<void> {
    (this.plugin.configuration as unknown as Record<string, unknown>)[key] = value;
    await this.plugin.saveConfiguration();
  }

  //#endregion

	//#region Legacy Settings

  //#region Obsidian Binding Hooks

	// Legacy settings
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

		// Obsidian version < 1.13.0 styling
    this.containerEl.addClass(`${this.plugin.manifest.id}-legacy-settings-tab`);

    // Plugin and data schema version row w/ bug reporting copy
    const pluginVersion = `Version ${this.plugin.manifest.version}`;
    const dataJsonSchemaVersion = `Data schema version: ${DATA_JSON_SCHEMA_VERSION}`;
    new Setting(containerEl)
      .setName(pluginVersion)
			.setDesc(dataJsonSchemaVersion)
			.addExtraButton((b) =>
				b.setIcon("github").setTooltip("GitHub repository")
				.onClick(() => window.open(`https://github.com/Jalad25/${this.plugin.manifest.id}`, "_blank"))
			)
			.addExtraButton((b) =>
				b.setIcon("bug").setTooltip("Report a bug")
				.onClick(() => window.open(`https://github.com/Jalad25/${this.plugin.manifest.id}/issues/new?template=bug_report.yml`, "_blank"))
			)
      .addButton((b) => {
        b.setCta()
         .setButtonText("Copy details for bug report")
          .onClick(async () => {
            const report = await this.buildBugReport();
            await navigator.clipboard.writeText(this.formatBugReport(report));
            new Notice("Copied bug report details");
          });
      });

    /* Contact File Identification */
    new Setting(containerEl)
			.setName("Contact file identification")
			.setHeading();

		// useFolder
		this.renderToggleSetting(containerEl, "Identify contacts by folder", "When enabled, any note inside the specified folder is treated as a contact note. When disabled, notes tagged with the specified tag are used instead.", "useFolder", true);

    if (this.plugin.configuration.useFolder) {
			// folderPath
			this.renderFolderSetting(containerEl, "Contacts folder path", 'Path to the folder containing contact notes, relative to the vault root (e.g. "contacts" or "people/contacts"). Notes in subfolders are included. Cannot be root of the vault.', "folderPath", false, "Contacts");
    } else {
			// tag
			this.renderTextSetting(containerEl, "Contact tag", 'Tag used to identify contact notes. Omit the leading "#" (e.g. "contact").', "tag", false, "Contact");
    }

    /* Contacts View Settings */
    new Setting(containerEl)
			.setName("Contacts view in a panel")
			.setHeading();

		// viewName
		this.renderTextSetting(containerEl, "View name", "Name displayed at the top of the contacts view in the panel.", "viewName", false, "Contacts");

    /* Bases Settings */
    new Setting(containerEl)
			.setName("Contacts view in a base")
			.setHeading();

		// baseFolderPath
		this.renderFolderSetting(containerEl, "New base folder path", "Folder where new contacts bases are created, relative to the vault root. Leave empty to place them in the vault root.", "baseFolderPath", false, "");

    /* Contact Card */
    new Setting(containerEl)
			.setName("Contact card")
			.setHeading();

		this.renderToggleSetting(containerEl, "Show last modified date", "Show the date the contact note was last modified in the top-left corner of the contact card. Applies only to the card rendered inside a contact note, not the panel or base views.", "showLastModified", false);

    /* Frontmatter Properties Customization */
    new Setting(containerEl)
			.setName("Frontmatter properties customization")
			.setHeading();

    containerEl.createEl("p", {
      text: "Override the frontmatter property names this plugin reads from and writes to, and the lucide icons displayed for properties that show one. Leave a field blank to use the default. Renaming a property does not rewrite existing notes or base files. Existing base files that reference old property names will need to be updated manually.",
      cls: "setting-item-description",
    });

		this.renderFrontmatterGrid(containerEl);
  }

	//#endregion

	// Render folder input setting
  private renderFolderSetting(el: HTMLElement, name: string, desc: string, key: string, refreshOnChange: boolean, placeholder?: string): void {
    new Setting(el)
      .setName(name)
      .setDesc(desc)
      .addText((t) => {
				if (placeholder) t.setPlaceholder(placeholder);
        t.setValue(String(this.getControlValue(key)))
          .onChange(async (value) => {
            await this.setControlValue(key, value);
						if (refreshOnChange) this.refresh();
          });
				new FolderSuggest(this.app, t.inputEl, true);
			});
  }

	// Render text setting
  private renderTextSetting(el: HTMLElement, name: string, desc: string, key: string, refreshOnChange: boolean, placeholder?: string): void {
    new Setting(el)
      .setName(name)
      .setDesc(desc)
      .addText((t) => {
				if (placeholder) t.setPlaceholder(placeholder);
        t.setValue(String(this.getControlValue(key)))
          .onChange(async (value) => {
            await this.setControlValue(key, value);
						if (refreshOnChange) this.refresh();
          });
			});
  }

	// Render toggle setting
  private renderToggleSetting(el: HTMLElement, name: string, desc: string, key: string, refreshOnChange: boolean): void {
    new Setting(el)
      .setName(name)
      .setDesc(desc)
      .addToggle((t) =>
        t.setValue(this.getControlValue(key) as boolean)
          .onChange(async (value) => {
						await this.setControlValue(key, value);
						if (refreshOnChange) this.refresh();
					})
      );
  }

	//#endregion

	//#region Declarative Settings

	//#region Obsidian Binding Hooks

  // Declarative settings
	getSettingDefinitions(): SettingDefinitionItem[] {
    const items: SettingDefinitionItem[] = [];

    // Obsidian version >= 1.13.0 styling
    this.containerEl.addClass(`${this.plugin.manifest.id}-declarative-settings-tab`);

    // Plugin and data schema version row w/ bug reporting copy
		const pluginVersion = `Version ${this.plugin.manifest.version}`;
		const dataJsonSchemaVersion = `Data schema version: ${DATA_JSON_SCHEMA_VERSION}`;
		items.push({
			name: " ",
			render: (setting) => {
				setting.setName(pluginVersion)
					.setDesc(dataJsonSchemaVersion)
					.addExtraButton((b) =>
						b.setIcon("github").setTooltip("GitHub repository")
						.onClick(() => window.open(`https://github.com/Jalad25/${this.plugin.manifest.id}`, "_blank"))
					)
					.addExtraButton((b) =>
						b.setIcon("bug").setTooltip("Report a bug")
						.onClick(() => window.open(`https://github.com/Jalad25/${this.plugin.manifest.id}/issues/new?template=bug_report.yml`, "_blank"))
					)
					.addButton((b) => {
						b.setCta()
						.setButtonText("Copy details for bug report")
							.onClick(async () => {
								const report = await this.buildBugReport();
								await navigator.clipboard.writeText(this.formatBugReport(report));
								new Notice("Copied bug report details");
							});
					});
			}
		});

		// Contact File Identification
		items.push({
			type: "group",
			heading: "Contact file identification",
			items: [
				{ name: " ",
					render: (setting) => {
						setting.settingEl.empty();
						this.renderToggleSetting(setting.settingEl, "Identify contacts by folder", "When enabled, any note inside the specified folder is treated as a contact note. When disabled, notes tagged with the specified tag are used instead.", "useFolder", true);
					}
				},
				{ name: "Contacts folder path", desc: 'Path to the folder containing contact notes, relative to the vault root (e.g. "contacts" or "people/contacts"). Notes in subfolders are included. Cannot be root of the vault.', visible: () => this.plugin.configuration.useFolder, control: { type: "folder", key: "folderPath", placeholder: "Contacts", includeRoot: false } },
				{ name: "Contact tag", desc: 'Tag used to identify contact notes. Omit the leading "#" (e.g. "contact").', visible: () => !this.plugin.configuration.useFolder, control: { type: "text", key: "tag", placeholder: "Contact" } }
			]
		});

		// Contacts view in a panel
		items.push({
			type: "group",
			heading: "Contacts view in a panel",
			items: [
				{ name: "View name", desc: "Name displayed at the top of the contacts view in the panel.", control: { type: "text", key: "viewName", placeholder: "Contacts" } }
			]
		});

		// Contacts view in a base
		items.push({
			type: "group",
			heading: "Contacts view in a base",
			items: [
				{ name: "New base folder path", desc: "Folder where new contacts bases are created, relative to the vault root. Leave empty to place them in the vault root.", control: { type: "folder", key: "baseFolderPath", placeholder: "", includeRoot: true } }
			]
		});

		// Contact card
		items.push({
			type: "group",
			heading: "Contact card",
			items: [
				{ name: "Show last modified date", desc: "Show the date the contact note was last modified in the top-left corner of the contact card. Applies only to the card rendered inside a contact note, not the panel or base views.", control: { type: "toggle", key: "showLastModified" } }
			]
		});

		// Frontmatter properties customization — bespoke grid rendered imperatively
		items.push({
			type: "group",
			heading: "Frontmatter properties customization",
			desc: "Override the frontmatter property names this plugin reads from and writes to, and the lucide icons displayed for properties that show one. Leave a field blank to use the default. Renaming a property does not rewrite existing notes or base files. Existing base files that reference old property names will need to be updated manually.",
			items: [
				{ name: " ",
					render: (setting) => {
						setting.settingEl.empty();
						setting.settingEl.addClass(`${this.plugin.manifest.id}-settings-fm-grid-row`);
						this.renderFrontmatterGrid(setting.settingEl);
					}
				}
			]
		});

    return items;
  }

  //#endregion

	//#endregion

	//#region Shared Settings Functions

	// Render frontmatter grid with customization settings
  private renderFrontmatterGrid(containerEl: HTMLElement): void {
    const grid = containerEl.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid` });

    grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-header`, text: "Property" });
    grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-header`, text: "Override name" });
    grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-header`, text: "Icon" });

		for (const field of this.plugin.contactNote.getFields()) {
      if (field.origin !== "builtin") continue;

      grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-name`, text: field.key });

      const keyCell = grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-cell` });
      const keyInput = keyCell.createEl("input", { type: "text" });
      keyInput.placeholder = field.key;
      keyInput.value = this.plugin.configuration.frontmatterCustomizations[field.key]?.keyOverride ?? "";
      keyInput.addEventListener("change", () => {
        const trimmed = keyInput.value.trim();
        const current = this.plugin.configuration.frontmatterCustomizations[field.key] ?? {};
        const next: FrontmatterCustomization = { ...current };
        if (trimmed && trimmed !== field.key) next.keyOverride = trimmed;
        else delete next.keyOverride;
        this.setOrClearCustomization(field.key, next);
        void this.plugin.saveConfiguration();
      });

      const iconCell = grid.createDiv({ cls: `${this.plugin.manifest.id}-settings-fm-grid-cell` });
      if (field.defaultIcon) {
        const iconPreview = iconCell.createSpan({ cls: `${this.plugin.manifest.id}-settings-icon-preview` });
        const renderPreview = (name: string) => {
          iconPreview.empty();
          if (name) setIcon(iconPreview, name);
        };
        renderPreview(this.plugin.contactNote.getIcon(field) ?? "");

        const iconInput = iconCell.createEl("input", { type: "text" });
        iconInput.placeholder = field.defaultIcon;
        iconInput.value = this.plugin.configuration.frontmatterCustomizations[field.key]?.icon ?? "";
        iconInput.addEventListener("change", () => {
          const trimmed = iconInput.value.trim();
          const current = this.plugin.configuration.frontmatterCustomizations[field.key] ?? {};
          const next: FrontmatterCustomization = { ...current };
          if (trimmed && trimmed !== field.defaultIcon) next.icon = trimmed;
          else delete next.icon;
          this.setOrClearCustomization(field.key, next);
          void this.plugin.saveConfiguration();
          renderPreview(trimmed || (field.defaultIcon ?? ""));
        });
      }
    }
  }

	//#endregion

	//#region Utilities

	// Set or clear frontmatter customizations
  private setOrClearCustomization(key: string, c: FrontmatterCustomization): void {
    if (c.keyOverride || c.icon) {
      this.plugin.configuration.frontmatterCustomizations[key] = c;
    } else {
      delete this.plugin.configuration.frontmatterCustomizations[key];
    }
  }

	// Collect data for a bug report
	private async buildBugReport(): Promise<BugReport> {
		// Tap into a properties not in the Obsidian public API to get list of themes, active theme, and enabled plugins
		const internals = this.app as App & {
			plugins?: { enabledPlugins?: Set<string> };
			customCss?: { theme?: string, themes?: Record<string, unknown> };
		};

		return {
			pluginVersion: this.plugin.manifest.version,
			obsidianVersion: apiVersion,
			colorScheme: activeDocument.querySelector(".theme-light") ? "light" : "dark",
			dataSchemaVersion: DATA_JSON_SCHEMA_VERSION,
			activeTheme: internals.customCss?.theme ?? "",
			installedThemes: Object.keys(internals.customCss?.themes ?? {}).sort(),
			enabledPlugins: [...(internals.plugins?.enabledPlugins ?? [])].sort(),
			data: await this.plugin.loadData()
		};
	}

	// Format a bug report as plain text for the clipboard
	private formatBugReport(r: BugReport): string {
		const lines: string[] = [];
		lines.push(`Plugin version: ${r.pluginVersion}`);
		lines.push(`Obsidian version: ${r.obsidianVersion}`);
		lines.push(`Color scheme: ${r.colorScheme}`);
		lines.push(`Data schema version: ${r.dataSchemaVersion}`);
		lines.push("");
		lines.push(`Active theme: ${r.activeTheme || "(default)"}`);
		lines.push("Installed themes:");
		if (r.installedThemes.length === 0) lines.push("  (none)");
		else for (const t of r.installedThemes) lines.push(`  - ${t}`);
		lines.push("");
		lines.push("Enabled plugins:");
		if (r.enabledPlugins.length === 0) lines.push("  (none)");
		else for (const p of r.enabledPlugins) lines.push(`  - ${p}`);
		lines.push("");
		lines.push("data.json:");
		lines.push(JSON.stringify(r.data, null, 2));
		return lines.join("\n");
	}

	//#endregion

}

//#endregion
