import AppIntents
import Foundation

struct OpenDashboardIntent: AppIntent {
    static var title: LocalizedStringResource = "Open __APP_NAME__ Dashboard"
    static var description = IntentDescription("Opens __APP_NAME__ so the user can continue from the main dashboard.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        .result()
    }
}

struct __MODULE_NAME__Shortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenDashboardIntent(),
            phrases: ["Open \(.applicationName)", "Show \(.applicationName) dashboard"],
            shortTitle: "Open Dashboard",
            systemImageName: "rectangle.split.3x1"
        )
    }
}
