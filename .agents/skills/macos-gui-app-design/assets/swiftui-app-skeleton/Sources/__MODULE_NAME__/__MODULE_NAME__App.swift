import SwiftUI

@main
struct __MODULE_NAME__App: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
        }
        .commands {
            AppCommandMenu()
            SidebarCommands()
            InspectorCommands()
        }

        Settings {
            SettingsView()
                .environment(model)
        }
    }
}
