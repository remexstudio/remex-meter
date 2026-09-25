import SwiftUI

struct AppCommandMenu: Commands {
    @FocusedValue(\.primaryAction) private var primaryAction

    var body: some Commands {
        CommandMenu("__APP_NAME__") {
            Button("Run Primary Action") {
                primaryAction?()
            }
            .keyboardShortcut("r", modifiers: [.command])
            .disabled(primaryAction == nil)
        }
    }
}

private struct PrimaryActionKey: FocusedValueKey {
    typealias Value = () -> Void
}

extension FocusedValues {
    var primaryAction: (() -> Void)? {
        get { self[PrimaryActionKey.self] }
        set { self[PrimaryActionKey.self] = newValue }
    }
}
