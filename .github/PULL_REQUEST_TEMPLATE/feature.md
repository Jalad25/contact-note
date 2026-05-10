<!-- Template for a new feature. Append ?template=feature.md to the PR URL to use this template. -->

## Summary

<!-- A short description of the feature being added. -->

## Related issue

<!-- New features should reference an existing feature request. Use "Closes #123" to auto-close on merge. -->

Closes #

## Motivation

<!-- What problem does this feature solve? Who is it for? -->

## What's new

<!-- A bullet list of the user-facing changes: new commands, configuration, frontmatter fields, view behavior, etc. -->

-

## Configuration / frontmatter changes

<!-- List any new or modified configurations or frontmatter fields. Note defaults and any required schema migration for existing users (see DEVELOPMENT.md → Configuration Schema Migrations). Delete this section if not applicable. -->

## Screenshots / recordings

<!-- Required for any UI-visible feature. Include the contact card, sidebar view, bases view, settings tab, or any new UI surface affected. -->

## Backwards compatibility

<!-- Does this change affect existing contact notes, configurations, or saved data? Will users notice anything different on upgrade? -->

## Checklist

- [ ] I have read the [contributing guidelines](../../CONTRIBUTING.md).
- [ ] This PR is linked to an existing feature request issue.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes with no TypeScript errors.
- [ ] I have tested with both folder-based and tag-based contact identification (if relevant).
- [ ] I have tested in both the sidebar contacts view and a contacts base view (`.base` file), if the change touches shared rendering or contact data.
- [ ] I have tested with existing contact notes to confirm no regression.
- [ ] I have tested the affected UI in both light and dark mode (if any styles or DOM structure were touched).
- [ ] I have tested the feature on both the Obsidian desktop application and the Obsidian mobile app (if relevant).
- [ ] I have added a schema migration in `ConfigurationSchemaMigration.ts` if this PR changes the on-disk shape of `ContactNoteConfiguration`.
- [ ] Configuration persist correctly across reloads (if configurations were changed).
