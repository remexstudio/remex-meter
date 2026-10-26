import SwiftUI

struct SettingsView: View {
    @AppStorage("launchAtLoginRequested") private var launchAtLoginRequested = false
    @AppStorage("showAdvancedDiagnostics") private var showAdvancedDiagnostics = false

    var body: some View {
        Form {
            Section("General") {
                Toggle("Request launch at login", isOn: $launchAtLoginRequested)
                    .help("Wire this to SMAppService after product requirements and distribution channel are decided.")
                Toggle("Show advanced diagnostics", isOn: $showAdvancedDiagnostics)
            }

            Section("Release planning") {
                LabeledContent("Bundle ID", value: "__BUNDLE_ID__")
                LabeledContent("Minimum macOS", value: "__MINIMUM_MACOS__")
                Text("Configure sandbox, entitlements, hardened runtime, notarization, and helper tools before release engineering starts.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding(24)
        .frame(minWidth: 480, idealWidth: 520, minHeight: 320)
        .navigationTitle("Settings")
    }
}

#Preview {
    SettingsView()
}
