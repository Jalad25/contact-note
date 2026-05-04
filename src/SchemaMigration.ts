/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- This module reads untyped JSON of unknown shape from prior plugin versions. Strict typing here would only obscure the runtime guards that actually protect against malformed input. */

import { ContactNoteSettings } from "./main";

//#region Constants

export const CURRENT_SCHEMA_VERSION = 0;

const MIGRATIONS: Migration[] = [];

//#endregion

//#region Types/Objects/Interfaces

type Migration = {
  from: number;
  to: number;
  apply: (raw: any) => Partial<ContactNoteSettings> & { schemaVersion: number };
};

export type MigrationResult = {
  values: Partial<ContactNoteSettings>;
  migrated: boolean;
};

//#endregion

//#region Migration

export function migrate(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== "object") {
    return { values: { schemaVersion: CURRENT_SCHEMA_VERSION }, migrated: true };
  }

  let current: any = raw;
  let version: number = typeof current.schemaVersion === "number" ? current.schemaVersion : 0;

  let migrated = false;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) break;
    current = step.apply(current);
    version = step.to;
    migrated = true;
  }

  return {
    values: current as Partial<ContactNoteSettings>,
    migrated
  };
}

//#endregion

//#region Migration Step Functions

/* This is a per-version migration steps. Append new functions below for each schema change and add it to MIGRATIONS. Never edit existing steps. */

//#endregion
