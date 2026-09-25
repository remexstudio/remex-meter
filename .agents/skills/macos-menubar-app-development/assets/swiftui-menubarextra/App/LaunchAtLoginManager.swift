import ServiceManagement

@MainActor
enum LaunchAtLoginManager {
    static var isEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    static func setEnabled(_ enabled: Bool) throws {
        switch (enabled, SMAppService.mainApp.status) {
        case (true, .enabled), (false, .notRegistered):
            return
        case (true, _):
            try SMAppService.mainApp.register()
        case (false, _):
            try SMAppService.mainApp.unregister()
        }
    }
}
