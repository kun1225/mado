## Code Organization

- Keep the primary exported function near the top of its implementation file so the developer can see the prmiary function when they get into the file.
- Keep feature-specific implementation details in the feature module when they have no independent reuse.
- Extract feature types into a dedicated `<feature>.type.ts` file.
- Prefix feature types with the feature name and use PascalCase, such as `SitePreviewHtmlMetadata`.
