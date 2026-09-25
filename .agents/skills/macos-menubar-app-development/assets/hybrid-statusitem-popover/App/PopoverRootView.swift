import AppKit
import SwiftUI

struct PopoverRootView: View {
    @Bindable var appState: AppState
    let openSettings: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(appState.statusLine)
                .font(.headline)

            Text(appState.shellDescription)
                .font(.caption)
                .foregroundStyle(.secondary)

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

            Button("Open Settings…") {
                openSettings()
            }

            Button("Quit") {
                NSApp.terminate(nil)
            }

            if let lastError = appState.lastError {
                Divider()
                Text(lastError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(14)
        .frame(width: 320)
        .task {
            appState.refreshExternalState()
        }
    }
}
