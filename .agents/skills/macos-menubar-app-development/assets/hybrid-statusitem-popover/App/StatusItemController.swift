import AppKit
import SwiftUI

@MainActor
final class StatusItemController: NSObject {
    private let appState: AppState
    private let openSettingsAction: () -> Void
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let popover = NSPopover()

    init(appState: AppState, openSettings: @escaping () -> Void) {
        self.appState = appState
        self.openSettingsAction = openSettings
        super.init()

        popover.behavior = .transient
        popover.contentSize = NSSize(width: 320, height: 240)
        popover.contentViewController = NSHostingController(
            rootView: PopoverRootView(
                appState: appState,
                openSettings: openSettings
            )
        )

        statusItem.autosaveName = "__BUNDLE_ID__.statusitem"

        guard let button = statusItem.button else {
            return
        }

        button.toolTip = "__APP_NAME__"
        button.image = NSImage(
            systemSymbolName: "__STATUS_SYMBOL__",
            accessibilityDescription: "__APP_NAME__"
        )
        button.image?.isTemplate = true
        button.target = self
        button.action = #selector(handleStatusItemClick(_:))
        button.sendAction(on: [.leftMouseUp, .rightMouseUp])
    }

    @objc
    private func handleStatusItemClick(_ sender: NSStatusBarButton) {
        let eventType = NSApp.currentEvent?.type
        switch eventType {
        case .rightMouseDown, .rightMouseUp:
            showContextMenu()
        default:
            togglePopover(relativeTo: sender)
        }
    }

    private func togglePopover(relativeTo button: NSStatusBarButton) {
        appState.refreshExternalState()

        if popover.isShown {
            popover.performClose(nil)
            return
        }

        NSApp.activate(ignoringOtherApps: true)
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    }

    private func showContextMenu() {
        popover.performClose(nil)

        let menu = NSMenu()

        let settingsItem = NSMenuItem(title: "Settings…", action: #selector(openSettingsFromMenu), keyEquivalent: ",")
        settingsItem.target = self
        menu.addItem(settingsItem)

        menu.addItem(.separator())

        let quitItem = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.popUpMenu(menu)
    }

    @objc
    private func openSettingsFromMenu() {
        openSettingsAction()
    }

    @objc
    private func quit() {
        NSApp.terminate(nil)
    }
}
