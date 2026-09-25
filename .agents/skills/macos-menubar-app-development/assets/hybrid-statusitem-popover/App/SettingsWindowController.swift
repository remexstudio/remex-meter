import AppKit
import SwiftUI

@MainActor
final class SettingsWindowController {
    private let appState: AppState
    private lazy var window: NSWindow = {
        let host = NSHostingController(rootView: SettingsView(appState: appState))
        let window = NSWindow(contentViewController: host)
        window.title = "__APP_NAME__ Settings"
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.setContentSize(NSSize(width: 520, height: 360))
        window.isReleasedWhenClosed = false
        window.setFrameAutosaveName("__BUNDLE_ID__.settings")
        window.center()
        return window
    }()

    init(appState: AppState) {
        self.appState = appState
    }

    func show() {
        appState.refreshExternalState()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
