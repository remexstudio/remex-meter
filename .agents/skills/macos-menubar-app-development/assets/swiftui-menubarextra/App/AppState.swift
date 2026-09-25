import Foundation
import Observation

@MainActor
@Observable
final class AppState {
    var monitoringEnabled = true
    var launchAtLoginEnabled = false
    var lastRefresh = Date.now
    var lastError: String?

    init() {
        refreshLaunchAtLoginState()
    }

    var statusLine: String {
        monitoringEnabled ? "Monitoring active" : "Monitoring paused"
    }

    func toggleMonitoring() {
        monitoringEnabled.toggle()
        lastRefresh = .now
    }

    func refreshLaunchAtLoginState() {
        launchAtLoginEnabled = LaunchAtLoginManager.isEnabled
    }

    func setLaunchAtLogin(_ enabled: Bool) {
        do {
            try LaunchAtLoginManager.setEnabled(enabled)
            launchAtLoginEnabled = LaunchAtLoginManager.isEnabled
            lastError = nil
        } catch {
            launchAtLoginEnabled = LaunchAtLoginManager.isEnabled
            lastError = error.localizedDescription
        }
    }
}
