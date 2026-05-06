import { Modal, Setting } from "obsidian";
import ContactNotePlugin from "./main";

export class NewContactModal extends Modal {
  plugin: ContactNotePlugin;

  constructor(plugin: ContactNotePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "New contact" });

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
          .onClick(() => {
            this.close();
            void this.plugin.createNewContact(firstName.trim(), lastName.trim());
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
