## Code Organization

- Keep the primary exported function near the top of its implementation file so the developer can see the prmiary function when they get into the file.
- Order functions by their call hierarchy. Place the primary function first, then place each helper after its caller in call order.
- Add a `// *** FunctionName ***` comment before each secondary function to make the call hierarchy visible.
- Keep helper functions private by default. Export a helper only when direct testing provides real value, and place test-facing exports in a final export block.
- Keep feature-specific implementation details in the feature module when they have no independent reuse.
- Extract feature types into a dedicated `<feature>.type.ts` file.
- Prefix feature types with the feature name and use PascalCase, such as `SitePreviewHtmlMetadata`.
