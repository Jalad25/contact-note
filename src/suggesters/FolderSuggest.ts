import { 
	AbstractInputSuggest, 
	App, 
	TFolder 
} from "obsidian";

/* Attaches an autocomplete dropdown to a folder-path text input. Users can
   freely type a path or pick from the suggestion list. Matches existing
   folders by case-insensitive substring */
export class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(app: App, private inputEl: HTMLInputElement) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const q = query.toLowerCase();
    const out: string[] = [];
    const collect = (folder: TFolder) => {
      if (folder.path.toLowerCase().includes(q)) out.push(folder.path);
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
