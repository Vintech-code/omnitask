# Firebase native service files

Place downloaded native Firebase configuration files here. They are ignored by Git.

Expected Android filenames:

- `google-services.development.json`
- `google-services.staging.json`
- `google-services.production.json`

Expected iOS filenames:

- `GoogleService-Info.development.plist`
- `GoogleService-Info.staging.plist`
- `GoogleService-Info.production.plist`

Each Firebase project must register its matching application ID:

| Environment | Android package | iOS bundle ID |
|---|---|---|
| Development | `com.vincentements_007.omnitask.dev` | `com.vincentements_007.omnitask.dev` |
| Staging | `com.vincentements_007.omnitask.staging` | `com.vincentements_007.omnitask.staging` |
| Production | `com.vincentements_007.omnitask` | `com.vincentements_007.omnitask` |

Do not rename one environment's file for another environment. `app.config.js` verifies the Android package and Firebase project before generating native configuration.
