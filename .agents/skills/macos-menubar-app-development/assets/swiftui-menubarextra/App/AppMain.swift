import SwiftUI

@main
struct __APP_IDENTIFIER__App: App {
    @State private var appState = AppState()

    var body: some Scene {
        MenuBarExtra("__APP_NAME__", systemImage: "__STATUS_SYMBOL__") {
            MenuBarContentView(appState: appState)
        }
        .menuBarExtraStyle(.menu)

        Settings {
            SettingsView(appState: appState)
        }
    }
}
