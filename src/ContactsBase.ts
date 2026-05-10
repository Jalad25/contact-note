import { ContactNote } from "./ContactNote";
import { CONTACT_NOTE_LIST_VIEW_TYPE } from "./main";

//#region Types/Objects/Interfaces

interface AppendViewResult {
  content: string;
  formulaMismatch: boolean;
}

//#endregion

//#region Constants

const DEFAULT_PROPERTY_ORDER_KEYS = ["firstName", "middleName", "lastName", "displayName"] as const;

//#endregion

//#region Builders

export function getDefaultPropertyOrder(contactNote: ContactNote): string[] {
  return DEFAULT_PROPERTY_ORDER_KEYS.map((key) => {
    const field = contactNote.getField(key);
    return `note.${field ? contactNote.getReadKey(field) : key}`;
  });
}

function buildIsContactExpression(useFolder: boolean, folderPath: string, tag: string): string {
  return useFolder
    ? `file.inFolder("${folderPath.replace(/"/g, '\\"')}")`
    : `file.hasTag("${tag.replace(/^#/, "").replace(/"/g, '\\"')}")`;
}

function buildContactsBaseViewYaml(viewName: string, contactNote: ContactNote): string[] {
  const lastNameField = contactNote.getField("lastName");
  const lastNameKey = lastNameField ? contactNote.getReadKey(lastNameField) : "lastName";
  return [
    `  - type: ${CONTACT_NOTE_LIST_VIEW_TYPE}`,
    `    name: ${viewName}`,
    "    filters:",
    "      and:",
    "        - formula.isContact",
    "    order:",
    ...getDefaultPropertyOrder(contactNote).map((p) => `      - ${p}`),
    "    sort:",
    `      - property: note.${lastNameKey}`,
    "        direction: ASC",
    "    condensed: true",
    "    lastNameFirst: true",
    "    showDetails: false",
  ];
}

export function buildContactsBaseFile(
  useFolder: boolean, folderPath: string, tag: string,
  viewName: string,
  contactNote: ContactNote,
): string {
  const isContactExpr = buildIsContactExpression(useFolder, folderPath, tag);
  return [
    "formulas:",
    `  isContact: ${JSON.stringify(isContactExpr)}`,
    "views:",
    ...buildContactsBaseViewYaml(viewName, contactNote),
    "",
  ].join("\n");
}

//#endregion

//#region Mutators

export function appendContactsViewToBase(
  existingContent: string,
  useFolder: boolean, folderPath: string, tag: string,
  viewName: string,
  contactNote: ContactNote,
): AppendViewResult {
  const expectedExpr = buildIsContactExpression(useFolder, folderPath, tag);

  const isContactMatch = /^( {2}|\t)isContact:\s*(.+)$/m.exec(existingContent);
  let updated = existingContent;
  let formulaMismatch = false;

  if (isContactMatch) {
    // Strip surrounding quotes (single or double) if Bases re-serialized it.
    const existing = isContactMatch[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (existing !== expectedExpr) {
      formulaMismatch = true;
    }
  } else {
    /* Need to add the formula. Insert into existing formulas: block, or
       create one at the top of the file */
    const formulasHeader = /^formulas:\s*$/m.exec(existingContent);
    const formulaLine = `  isContact: ${JSON.stringify(expectedExpr)}`;
    if (formulasHeader) {
      const insertAt = formulasHeader.index + formulasHeader[0].length;
      updated = updated.slice(0, insertAt) + "\n" + formulaLine + updated.slice(insertAt);
    } else {
      updated = `formulas:\n${formulaLine}\n${updated}`;
    }
  }

  /* Append the new view block. If the file already has a views: section,
     append after the last line; otherwise add a views: section.
     Bases keeps views as a top-level list, and any list-item starting
     with "  - " is treated as the next view */
  const viewBlock = buildContactsBaseViewYaml(viewName, contactNote).join("\n");
  const viewsHeader = /^views:\s*$/m.exec(updated);
  if (!updated.endsWith("\n")) updated += "\n";
  if (viewsHeader) {
    updated += viewBlock + "\n";
  } else {
    updated += `views:\n${viewBlock}\n`;
  }

  return { content: updated, formulaMismatch };
}

//#endregion
