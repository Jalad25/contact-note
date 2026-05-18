import { FrontmatterLinkCache, TFile } from "obsidian";
import { ContactNote } from "./ContactNote";

//#region Types/Objects/Interfaces

export interface SocialEntry {
  name: string;
  handle: string;
}

//#endregion

//#region Contact

export class Contact {
  readonly file: TFile;
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;
  title: string;
  company: string;
  emails: string[];
  phoneNumbers: string[];
  photo: string;
  socials: SocialEntry[];
  rawFrontmatter: Record<string, unknown>;
  frontmatterLinks: FrontmatterLinkCache[];

  private constructor(file: TFile) {
    this.file = file;
    this.firstName = "";
    this.middleName = "";
    this.lastName = "";
    this.displayName = "";
    this.title = "";
    this.company = "";
    this.photo = "";
    this.emails = [];
    this.phoneNumbers = [];
    this.socials = [];
    this.rawFrontmatter = {};
    this.frontmatterLinks = [];
  }

  static fromCache(
    file: TFile,
    frontmatter: Record<string, unknown>,
    frontmatterLinks: FrontmatterLinkCache[] | undefined,
    contactNote: ContactNote,
  ): Contact {
    const contact = new Contact(file);
    contact.update(frontmatter, frontmatterLinks, contactNote);
    return contact;
  }

  update(
    frontmatter: Record<string, unknown>,
    frontmatterLinks: FrontmatterLinkCache[] | undefined,
    contactNote: ContactNote,
  ): void {
    this.rawFrontmatter = frontmatter;
    this.frontmatterLinks = frontmatterLinks ?? [];

    for (const field of contactNote.getFields()) {
      if (field.kind === "socials") continue;
      const raw = frontmatter[contactNote.getReadKey(field)];
      if (field.kind === "scalar") {
        (this as unknown as Record<string, string>)[field.key] = trimStr(raw);
      } else {
        (this as unknown as Record<string, string[]>)[field.key] = parseStrArr(raw);
      }
    }

    this.socials = [];
    const socialsField = contactNote.getField("socials");
    const socialsKey = socialsField ? contactNote.getReadKey(socialsField) : "socials";
    const socialsRaw = frontmatter[socialsKey];
    if (Array.isArray(socialsRaw)) {
      for (const item of socialsRaw) {
        if (item && typeof item === "object") {
          for (const [name, handle] of Object.entries(item as Record<string, unknown>)) {
            const h = typeof handle === "string" ? handle.trim() : "";
            if (!h) continue;
            this.socials.push({ name: name.toLowerCase(), handle: h });
          }
        }
      }
    }
  }

  get isValid(): boolean {
    return !!(this.firstName && this.lastName);
  }

  getFieldLink(readKey: string): FrontmatterLinkCache | undefined {
    return this.frontmatterLinks.find((l) => l.key === readKey);
  }
}

//#endregion

//#region Utilities

function trimStr(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function parseStrArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((item): item is string => typeof item === "string");
  if (typeof v !== "string") return [];
  return [v];
}

//#endregion
