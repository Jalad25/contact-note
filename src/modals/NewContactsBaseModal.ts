import {
  Modal,
  normalizePath,
  Notice,
  Setting,
  TFile
} from "obsidian";
import { buildContactsBaseFile } from "../ContactsBase";
import ContactNotePlugin from "../main";

export class NewContactsBaseModal extends Modal {
  plugin: ContactNotePlugin;

  constructor(plugin: ContactNotePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
		this.setTitle("New base with contacts view");

    const { contentEl } = this;

    let baseFileName = "";
    let viewName = "";

    new Setting(contentEl)
      .setName("Base file name")
      .addText((text) =>
        text
          .setPlaceholder("Contacts")
          .onChange((value) => { baseFileName = value; })
      );

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
          .setButtonText("Create")
          .setCta()
          .onClick(async () => {
            this.close();
            const file = await this.createContactsBaseFile(
              baseFileName.trim() || "Contacts",
              viewName.trim() || "Contacts",
            );
            await this.plugin.app.workspace.getLeaf(false).openFile(file);
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

	//#region Utilities

  private async createContactsBaseFile(baseFileName: string, viewName: string): Promise<TFile> {
    const { app, configuration } = this.plugin;

		// Folder path
    const rawFolderPath = normalizePath(configuration.baseFolderPath);
    const resolvedFolderPath = rawFolderPath === "/" ? "" : rawFolderPath;
    if (resolvedFolderPath && !app.vault.getAbstractFileByPath(resolvedFolderPath)) {
      await app.vault.createFolder(resolvedFolderPath);
    }
    const folderPrefix = resolvedFolderPath ? `${resolvedFolderPath}/` : "";

		// File name
    let resolvedFileName = baseFileName;
    let counter = 1;
    while (app.vault.getAbstractFileByPath(`${folderPrefix}${resolvedFileName}.base`)) {
      resolvedFileName = `${baseFileName} ${++counter}`;
    }

		// Give user notice if disambiguation needed
    if (resolvedFileName !== baseFileName) {
      new Notice(`A base named ${baseFileName} already exists. Renamed to ${resolvedFileName}.`);
    }

		// File content
    const content = buildContactsBaseFile(
      configuration.useFolder,
      configuration.folderPath,
      configuration.tag,
      viewName,
      this.plugin.contactNote,
    );

    return app.vault.create(`${folderPrefix}${resolvedFileName}.base`, content);
  }

	//#endregion
}
