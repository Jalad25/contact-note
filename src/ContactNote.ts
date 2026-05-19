//#region Types/Objects/Interfaces

type FieldKind = "scalar" | "list" | "socials";

type FieldOrigin = "builtin" | "user";

export interface FieldDef {
  key: string;
  kind: FieldKind;
  origin: FieldOrigin;
  defaultValue?: string;
  defaultIcon?: string;
  allowsInternalLink?: boolean;
  keyOverride?: string;
  icon?: string;
}

export interface FrontmatterCustomization {
  keyOverride?: string;
  icon?: string;
}

//#endregion

//#region Constants

const BUILTIN_FIELD_DEFS: readonly Omit<FieldDef, "keyOverride" | "icon">[] = [
  { key: "firstName", kind: "scalar", origin: "builtin" },
  { key: "middleName", kind: "scalar", origin: "builtin" },
  { key: "lastName", kind: "scalar", origin: "builtin" },
  { key: "displayName", kind: "scalar", origin: "builtin" },
  { key: "company", kind: "scalar", origin: "builtin", allowsInternalLink: true, defaultIcon: "building-2" },
  { key: "department", kind: "scalar", origin: "builtin", allowsInternalLink: true, defaultIcon: "network" },
  { key: "title", kind: "scalar", origin: "builtin", allowsInternalLink: true },
  { key: "emails", kind: "list", origin: "builtin", defaultIcon: "mail" },
  { key: "phoneNumbers", kind: "list", origin: "builtin", defaultIcon: "phone" },
  { key: "birthday", kind: "scalar", origin: "builtin", defaultIcon: "cake" },
  { key: "lastInteraction", kind: "scalar", origin: "builtin", defaultIcon: "calendar-clock" },
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

  /* Lucide icon name to display alongside the field's value(s). Returns the
     user's custom icon if set, otherwise the field's default. May be undefined
     for fields that don't render an icon. */
  getIcon(field: FieldDef): string | undefined {
    if (field.icon && field.icon.trim()) return field.icon.trim();
    return field.defaultIcon;
  }

  applyCustomizations(customizations: Record<string, FrontmatterCustomization> | undefined): void {
    for (const field of this.fields) {
      if (field.origin !== "builtin") continue;
      const c = customizations?.[field.key];
      const keyOverride = c?.keyOverride?.trim();
      const icon = c?.icon?.trim();
      field.keyOverride = keyOverride ? keyOverride : undefined;
      field.icon = icon ? icon : undefined;
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
