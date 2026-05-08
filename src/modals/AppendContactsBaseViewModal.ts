import {
  Modal,
  Notice,
  Setting,
  TFile
} from "obsidian";
import { appendContactsViewToBase } from "../ContactsBase";
import ContactNotePlugin from "../main";

export class AppendContactsBaseViewModal extends Modal {
  plugin: ContactNotePlugin;
  private targetFile: TFile;

  constructor(plugin: ContactNotePlugin, targetFile: TFile) {
    super(plugin.app);
    this.plugin = plugin;
    this.targetFile = targetFile;
  }

  onOpen(): void {
		this.setTitle("Add contacts view");
		
    const { contentEl } = this;

    let viewName = "";

    new Setting(contentEl)
      .setName("View name")
      .addText((text) =>
        text
          .setPlaceholder("Contacts")
          .onChange((value) => { viewName = value; })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Add")
          .setCta()
          .onClick(async () => {
            this.close();
            await this.appendContactsView(viewName.trim() || "Contacts");
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

	//#region Utilities

  private async appendContactsView(viewName: string): Promise<void> {
    const { app, configuration } = this.plugin;

		// Append contacts base view
    const content = await app.vault.read(this.targetFile);
    const result = appendContactsViewToBase(content, configuration.useFolder, configuration.folderPath, configuration.tag, viewName);
    await app.vault.modify(this.targetFile, result.content);

    if (result.formulaMismatch) {
      new Notice(
        `Contacts view added, but the existing is contact formula in this base does not match the current plugin settings. Update the formula manually if needed.`,
      );
    } else {
      new Notice(`Contacts view "${viewName}" added to ${this.targetFile.basename}.`);
    }
  }

	//#endregion
}
