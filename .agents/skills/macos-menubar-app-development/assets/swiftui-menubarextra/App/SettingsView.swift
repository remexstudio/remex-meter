import SwiftUI

struct SettingsView: View {
    @Bindable var appState: AppState

    var body: some View {
        Form {
            Section("Behavior") {
                Toggle(
                    "Pause monitoring",
                    isOn: Binding(
                        get: { !appState.monitoringEnabled },
                        set: { appState.monitoringEnabled = !$0 }
                    )
                )

                Toggle(
                    "Start at login",
                    isOn: Binding(
                        get: { appState.launchAtLoginEnabled },
                        set: { appState.setLaunchAtLogin($0) }
                    )
                )
            }

            Section("Architecture") {
                LabeledContent("Shell", value: "SwiftUI MenuBarExtra (.menu)")
                LabeledContent("Minimum macOS", value: "__MIN_MACOS__")
            }

            if let lastError = appState.lastError {
                Section("Last error") {
                    Text(lastError)
                        .foregroundStyle(.red)
                }
            }
        }
        .formStyle(.grouped)
        .padding(20)
        .frame(width: 460)
        .task {
            appState.refreshLaunchAtLoginState()
        }
    }
}
