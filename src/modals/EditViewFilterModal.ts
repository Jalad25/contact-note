import { 
	Modal, 
	Setting 
} from "obsidian";
import ContactNotePlugin from "../main";
import { FrontmatterFilter } from "../views/ContactsView";

//#region Constants

const NO_VALUE_OPERATORS: FrontmatterFilter["operator"][] = ["exists", "is true", "is false"];

//#endregion

export class EditViewFilterModal extends Modal {
  constructor(private plugin: ContactNotePlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    new Setting(contentEl).setName("Edit view filter").setHeading().setDesc("Contacts in the view will be limited to those matching all conditions below.");
    
		const listEl = contentEl.createDiv({ cls: `${this.plugin.manifest.id}-filter-container` });
    this.renderRows(listEl);

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText("Add filter condition").onClick(async () => {
          this.plugin.configuration.viewFilters.push({ property: "", operator: "contains", value: "" });
          await this.plugin.saveConfiguration();
          this.renderRows(listEl);
        }),
      );
  }

  onClose(): void {
    // Drop rows with an empty property
    const cleaned = this.plugin.configuration.viewFilters.filter(
      (f) => f.property.trim() !== "",
    );

    if (cleaned.length !== this.plugin.configuration.viewFilters.length) {
      this.plugin.configuration.viewFilters = cleaned;
      void this.plugin.saveConfiguration();
    }

    this.contentEl.empty();
  }

  private renderRows(containerEl: HTMLElement): void {
    containerEl.empty();
    const filters = this.plugin.configuration.viewFilters;

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
              await this.plugin.saveConfiguration();
            }),
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
              if (NO_VALUE_OPERATORS.includes(filters[i].operator)) {
                filters[i].value = "";
              }
              await this.plugin.saveConfiguration();
              this.renderRows(containerEl);
            }),
        );

      if (!NO_VALUE_OPERATORS.includes(filter.operator)) {
        setting.addText((text) =>
          text
            .setPlaceholder("Value")
            .setValue(filter.value)
            .onChange(async (value) => {
              filters[i].value = value;
              await this.plugin.saveConfiguration();
            }),
        );
      }

      setting.addExtraButton((btn) =>
        btn
          .setIcon("x")
          .setTooltip("Remove filter")
          .onClick(async () => {
            filters.splice(i, 1);
            await this.plugin.saveConfiguration();
            this.renderRows(containerEl);
          }),
      );
    }
  }
}
