import AppKit

@main
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let appState = AppState()

    private var statusItemController: StatusItemController?
    private lazy var settingsWindowController = SettingsWindowController(appState: appState)

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItemController = StatusItemController(
            appState: appState,
            openSettings: { [weak self] in
                self?.showSettings()
            }
        )
        appState.refreshExternalState()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showSettings()
        return true
    }

    func showSettings() {
        appState.refreshExternalState()
        settingsWindowController.show()
    }
}
