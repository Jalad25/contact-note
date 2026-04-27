import { TFile } from "obsidian";

//#region Social

export class Social {
  name: string;
  handle: string;

  constructor(name: string, handle: string) {
    this.name = name;
    this.handle = handle;
  }

  private static readonly URLS: Record<string, string> = {
    twitter:   "https://twitter.com",
    instagram: "https://instagram.com",
    linkedin:  "https://linkedin.com",
    github:    "https://github.com",
    facebook:  "https://facebook.com",
    youtube:   "https://youtube.com",
    tiktok:    "https://tiktok.com",
    bluesky:   "https://bsky.app",
    reddit:    "https://reddit.com",
    telegram:  "https://t.me",
    twitch:    "https://twitch.tv",
    snapchat:  "https://snapchat.com",
    pinterest: "https://pinterest.com",
  };

  get url(): string | null {
    const h = this.handle.replace(/^@/, "");
    switch (this.name) {
      case "twitter":
      case "instagram":
      case "github":
      case "facebook":
      case "telegram":
      case "twitch":
      case "pinterest":
        return `${Social.URLS[this.name]}/${h}`;
      case "youtube":
      case "tiktok":
        return `${Social.URLS[this.name]}/@${h}`;
      case "linkedin":  return `${Social.URLS.linkedin}/in/${h}`;
      case "bluesky":   return `${Social.URLS.bluesky}/profile/${h}`;
      case "reddit":    return `${Social.URLS.reddit}/user/${h}`;
      case "snapchat":  return `${Social.URLS.snapchat}/add/${h}`;
      default:          return null;
    }
  }
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
  phones: string[];
  photo: string;
  socials: Social[];
  rawFrontmatter: Record<string, unknown>;

  private constructor(file: TFile) {
    this.file = file;
    this.firstName      = "";
    this.middleName     = "";
    this.lastName       = "";
    this.displayName    = "";
    this.title          = "";
    this.company        = "";
    this.photo          = "";
    this.emails         = [];
    this.phones         = [];
    this.socials        = [];
    this.rawFrontmatter = {};
  }

  static fromCache(file: TFile, frontmatter: Record<string, unknown>): Contact {
    const contact = new Contact(file);
    contact.update(frontmatter);
    return contact;
  }

  update(frontmatter: Record<string, unknown>): void {
    this.rawFrontmatter = frontmatter;
    this.firstName   = trimStr(frontmatter.firstName);
    this.middleName  = trimStr(frontmatter.middleName);
    this.lastName    = trimStr(frontmatter.lastName);
    this.displayName = trimStr(frontmatter.displayName);
    this.title       = trimStr(frontmatter.title);
    this.company     = trimStr(frontmatter.company);
    this.photo       = trimStr(frontmatter.photo);

    this.emails  = parseStrArr(frontmatter.email);
    this.phones  = parseStrArr(frontmatter.phone);

    this.socials = [];
    if (Array.isArray(frontmatter.socials)) {
      for (const item of frontmatter.socials) {
        if (item && typeof item === "object") {
          for (const [name, handle] of Object.entries(item as Record<string, unknown>)) {
            const h = handle == null ? "" : String(handle).trim();
            if (!h) continue;
            this.socials.push(new Social(name.toLowerCase(), h));
          }
        }
      }
    }
  }

  get resolvedDisplayName(): string {
    if (this.displayName) return this.displayName;
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(" ");
  }

  get sortKey(): string {
    if (this.lastName && this.firstName) {
      return `${this.lastName} ${this.firstName}`.toLowerCase();
    }
    if (this.displayName) return this.displayName.toLowerCase();
    return this.file.basename.toLowerCase();
  }

  get isValid(): boolean {
    return !!(this.firstName && this.lastName);
  }
}

//#endregion

//#region Utilities

function trimStr(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

function parseStrArr(v: unknown): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

//#endregion