# Avalanche Scouting Mobile Apps

This directory contains the production-ready source code for the native iOS and Android versions of the Avalanche Scouting application. Both apps are architected to seamlessly integrate with your existing Supabase backend and Discord OAuth.

## Redirection Setup (CRITICAL)

For Discord OAuth to redirect back to the **app** (not the website), add this redirect URL in **Supabase Dashboard**:

1. Go to **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add:
   - `avalanche-scouting://login-callback`
3. Ensure **Discord** is enabled in **Auth Providers** with your Client ID and Secret.

Both iOS and Android use the scheme `avalanche-scouting` so the same URL works for each.

---

##  iOS App (Swift & SwiftUI)
**Directory**: `mobile/ios/`

### Setup Steps
1. **Create Project**: Open Xcode -> Create New Project -> App (iOS) -> Name: `AvalancheScouting`.
2. **Add Dependencies**: 
   - We have provided a `Package.swift` for reference.
   - In Xcode, go to **File** -> **Add Packages**.
   - Search for `https://github.com/supabase-community/supabase-swift.git` and add it.
3. **Import Files**: Drag all `.swift` files from `mobile/ios/` into your Xcode project.
4. **Configure Scheme**:
   - Go to your Project Target -> **Info** tab.
   - Expand **URL Types** at the bottom.
   - Click **+**. Set **Identifier** to `com.avalanche.scouting` and **URL Schemes** to `avalanche-scouting`.
5. **Run**: Select an iPhone simulator and press Cmd+R.

---

## 🤖 Android App (Kotlin & Jetpack Compose)
**Directory**: `mobile/android/`

### Setup Steps
1. **Open in Android Studio**: Open the `mobile/android/` folder as a project in Android Studio (File -> Open -> select `mobile/android`). If there is no Gradle wrapper, create a new Android project and copy the Kotlin source files from `mobile/android/app/src/main/kotlin/com/avalanche/scouting/` into your app module.
2. **Namespace**: Ensure your package name is `com.avalanche.scouting`.
3. **Project Files**: Use the provided `build.gradle` (Project), `app/build.gradle` (App), and `settings.gradle` from `mobile/android/`.
4. **Sync**: Click "Sync Project with Gradle Files".
5. **Run**: Select an emulator/device and click Run. Ensure the deep link `avalanche-scouting://login-callback` is configured in your app for Discord OAuth return.

---

## 🛠 Features & Integration
- **Direct Database Access**: Uses the `ylzahxkfmklwcgkogeff` project reference confirmed via MCP.
- **Unified Auth**: Uses exactly the same user accounts as the website.
- **Deep Linking**: Built-in logic to handle the `code` exchange after Discord login.
- **Native UI**: Uses Apple's SwiftUI and Google's Jetpack Compose for the smoothest possible experience.

## 📝 Next Steps for Development
- **Scouting Forms**: You can extend `HomeView` (iOS) or `HomeScreen` (Android) to include the `autonomous`, `teleop`, and `endgame` input fields.
- **Data Modeling**: All tables (`teams`, `matches`, `scouting_data`) are already accessible via the initialized Supabase clients.
