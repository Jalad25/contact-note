/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- This module reads untyped JSON of unknown shape from prior plugin versions. Strict typing here would only obscure the runtime guards that actually protect against malformed input. */

import { ContactNoteConfiguration, CURRENT_SCHEMA_VERSION } from "./main";

//#region Constants

const MIGRATIONS: Migration[] = [];

//#endregion

//#region Types/Objects/Interfaces

type Migration = {
  from: number;
  to: number;
  apply: (raw: any) => Partial<ContactNoteConfiguration> & { schemaVersion: number };
};

export type MigrationResult = {
  values: Partial<ContactNoteConfiguration>;
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
    values: current as Partial<ContactNoteConfiguration>,
    migrated
  };
}

//#region Migration Step Functions

/* This is a per-version migration steps. Append new functions below for each schema change 	
	 and add it to MIGRATIONS. Never edit existing steps. */

//#endregion

//#endregion
