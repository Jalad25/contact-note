//#region Types/Objects/Interfaces

type FieldKind = "scalar" | "list" | "socials";

type FieldOrigin = "builtin" | "user";

export interface FieldDef {
  key: string;
  kind: FieldKind;
  origin: FieldOrigin;
  defaultValue?: string;
  keyOverride?: string;
}

//#endregion

//#region Constants

const BUILTIN_FIELD_DEFS: readonly Omit<FieldDef, "keyOverride">[] = [
  { key: "firstName", kind: "scalar", origin: "builtin" },
  { key: "middleName", kind: "scalar", origin: "builtin" },
  { key: "lastName", kind: "scalar", origin: "builtin" },
  { key: "displayName", kind: "scalar", origin: "builtin" },
  { key: "company", kind: "scalar", origin: "builtin" },
  { key: "title", kind: "scalar", origin: "builtin" },
  { key: "emails", kind: "list",   origin: "builtin" },
  { key: "phoneNumbers", kind: "list",   origin: "builtin" },
  { key: "photo", kind: "scalar", origin: "builtin" },
  { key: "socials", kind: "socials", origin: "builtin" }
];

const SOCIAL_PLATFORMS: readonly string[] = [
  "twitter", "instagram", "linkedin", "github", "facebook",
  "youtube", "tiktok", "bluesky", "reddit", "discord",
  "telegram", "twitch", "snapchat", "pinterest"
];

//#endregion

//#region Contact Note

export class ContactNote {
  private fields: FieldDef[];

  constructor() {
    this.fields = BUILTIN_FIELD_DEFS.map((f) => ({ ...f }));
  }

  getFields(): readonly FieldDef[] {
    return this.fields;
  }

  getField(key: string): FieldDef | undefined {
    return this.fields.find((f) => f.key === key);
  }

  /* Frontmatter property name to read from / write to a note for the given field.
     If a user has set a custom override, that key is used. Otherwise the stable 
		 internal key is used. */
  getReadKey(field: FieldDef): string {
    return field.keyOverride && field.keyOverride.trim() ? field.keyOverride.trim() : field.key;
  }

  applyOverrides(overrides: Record<string, string> | undefined): void {
    for (const field of this.fields) {
      if (field.origin !== "builtin") continue;
      const override = overrides?.[field.key];
      field.keyOverride = override && override.trim() ? override.trim() : undefined;
    }
  }

  buildContactNote(firstName: string, lastName: string, tag?: string): string {
    const lines: string[] = ["---"];

    for (const field of this.fields) {
      if (field.kind === "socials") {
        lines.push(`${this.getReadKey(field)}:`);
        for (const platform of SOCIAL_PLATFORMS) {
          lines.push(`  - ${platform}: `);
        }
        continue;
      }
      let value = field.defaultValue ?? "";
      if (field.key === "firstName") value = firstName;
      else if (field.key === "lastName") value = lastName;
      lines.push(`${this.getReadKey(field)}: ${value}`);
    }

    lines.push("aliases:");
    if (firstName) lines.push(`  - ${firstName}`);

    if (tag) {
      lines.push("tags:");
      lines.push(`  - ${tag.replace(/^#/, "")}`);
    }

    lines.push("---");
    lines.push("");
    return lines.join("\n");
  }
}

//#endregion
