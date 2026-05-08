import { 
	AbstractInputSuggest, 
	App, 
	TFolder 
} from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private excludeRoot = false,
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const q = query.toLowerCase();
    const out: string[] = [];
    const collect = (folder: TFolder) => {
      const isRoot = folder.path === "" || folder.path === "/";
      if (!(isRoot && this.excludeRoot) && folder.path.toLowerCase().includes(q)) {
        out.push(folder.path);
      }
      for (const child of folder.children) {
        if (child instanceof TFolder) collect(child);
      }
    };
    collect(this.app.vault.getRoot());
    return out;
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value || "/");
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.trigger("input");
    this.close();
  }
}
