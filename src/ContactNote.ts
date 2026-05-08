//#region Types/Objects/Interfaces

type FieldKind = "scalar" | "list";

type FieldOrigin = "builtin" | "user";

interface FieldDef {
  key: string;
  kind: FieldKind;
  origin: FieldOrigin;
  defaultValue?: string;
}

interface ContactNoteProperties {
  firstName: string;
  lastName: string;
  tag?: string;
}

//#endregion

//#region Constants

export const BUILTIN_FIELDS: readonly FieldDef[] = [
  { key: "firstName", kind: "scalar", origin: "builtin" },
  { key: "middleName", kind: "scalar", origin: "builtin" },
  { key: "lastName", kind: "scalar", origin: "builtin" },
  { key: "displayName", kind: "scalar", origin: "builtin" },
  { key: "company", kind: "scalar", origin: "builtin" },
  { key: "title", kind: "scalar", origin: "builtin" },
  { key: "emails", kind: "list",   origin: "builtin" },
  { key: "phoneNumbers", kind: "list",   origin: "builtin" },
  { key: "photo", kind: "scalar", origin: "builtin" }
];

const SOCIAL_PLATFORMS: readonly string[] = [
  "twitter", "instagram", "linkedin", "github", "facebook",
  "youtube", "tiktok", "bluesky", "reddit", "discord",
  "telegram", "twitch", "snapchat", "pinterest"
];

//#endregion

//#region Template Builder

export function buildContactNote(properties: ContactNoteProperties): string {
  const lines: string[] = ["---"];

  for (const field of BUILTIN_FIELDS) {
    let value = field.defaultValue ?? "";
    if (field.key === "firstName") value = properties.firstName;
    else if (field.key === "lastName") value = properties.lastName;
    lines.push(`${field.key}: ${value}`);
  }

  lines.push("socials:");
  for (const platform of SOCIAL_PLATFORMS) {
    lines.push(`  - ${platform}: `);
  }

  lines.push("aliases:");
  if (properties.firstName) lines.push(`  - ${properties.firstName}`);

  if (properties.tag) {
    lines.push("tags:");
    lines.push(`  - ${properties.tag.replace(/^#/, "")}`);
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

//#endregion
