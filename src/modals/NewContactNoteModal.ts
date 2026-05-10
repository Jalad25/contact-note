import {
	Modal,
	normalizePath,
	Notice,
	Setting,
	TFile
} from "obsidian";
import ContactNotePlugin from "../main";

export class NewContactNoteModal extends Modal {
  plugin: ContactNotePlugin;

  constructor(plugin: ContactNotePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
		this.setTitle("New contact");

    const { contentEl } = this;

    let firstName = "";
    let lastName = "";

    new Setting(contentEl)
      .setName("First name")
      .addText((text) =>
        text.onChange((value) => { firstName = value; })
      );

    new Setting(contentEl)
      .setName("Last name")
      .addText((text) =>
        text.onChange((value) => { lastName = value; })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Create")
          .setCta()
          .onClick(async () => {
            this.close();
            const file = await this.createContactNote(firstName.trim(), lastName.trim());
            await this.plugin.app.workspace.getLeaf(false).openFile(file);
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

	//#region Utilities 

  private async createContactNote(firstName: string, lastName: string): Promise<TFile> {
    const { app, configuration } = this.plugin;

		// Folder path
    const rawFolderPath = configuration.useFolder ? normalizePath(configuration.folderPath) : "";
		const resolvedFolderPath = rawFolderPath === "/" ? "" : rawFolderPath;
    if (resolvedFolderPath && !app.vault.getAbstractFileByPath(resolvedFolderPath)) {
      await app.vault.createFolder(resolvedFolderPath);
    }
		const folderPrefix = resolvedFolderPath ? `${resolvedFolderPath}/` : "";

		// File name
    const originalFileName = [firstName, lastName].filter((s) => s.trim()).join(" ") || "New Contact";
    let resolvedFileName = originalFileName;
    let counter = 1;
    while (app.vault.getAbstractFileByPath(`${folderPrefix}${resolvedFileName}.md`)) {
      resolvedFileName = `${originalFileName} ${counter++}`;
    }

		// Give user notice if disambiguation needed
    if (resolvedFileName !== originalFileName) {
      new Notice(`A contact named ${originalFileName} already exists. Renamed to ${resolvedFileName}.`);
    }

		// File full path
		const filePath = `${folderPrefix}${resolvedFileName}.md`;

		// File content
    const tag = !configuration.useFolder && configuration.tag.trim() ? configuration.tag.trim() : undefined;
    const content = this.plugin.contactNote.buildContactNote(firstName, lastName, tag);

    return app.vault.create(filePath, content);
  }

	//#endregion
}
