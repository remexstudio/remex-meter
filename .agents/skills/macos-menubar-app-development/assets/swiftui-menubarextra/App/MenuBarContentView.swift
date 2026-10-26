import AppKit
import SwiftUI

struct MenuBarContentView: View {
    @Bindable var appState: AppState
    @Environment(\.openSettings) private var openSettings

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(appState.statusLine)
                .font(.headline)

            Text("Last refresh: \(appState.lastRefresh.formatted(date: .omitted, time: .standard))")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let lastError = appState.lastError {
                Text(lastError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Divider()

            Button(appState.monitoringEnabled ? "Pause monitoring" : "Resume monitoring") {
                appState.toggleMonitoring()
            }

            Toggle(
                "Start at login",
                isOn: Binding(
                    get: { appState.launchAtLoginEnabled },
                    set: { appState.setLaunchAtLogin($0) }
                )
            )

            Divider()

            Button("Settings…") {
                NSApp.activate(ignoringOtherApps: true)
                openSettings()
            }
            .keyboardShortcut(",", modifiers: .command)

            Button("Quit") {
                NSApp.terminate(nil)
            }
            .keyboardShortcut("q", modifiers: .command)
        }
        .padding(12)
        .frame(width: 300)
        .task {
            appState.refreshLaunchAtLoginState()
        }
    }
}
