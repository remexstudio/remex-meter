import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    enum Section: String, CaseIterable, Identifiable {
        case overview
        case projects
        case activity

        var id: Self { self }

        var title: String {
            switch self {
            case .overview: "Overview"
            case .projects: "Projects"
            case .activity: "Activity"
            }
        }

        var symbolName: String {
            switch self {
            case .overview: "sidebar.left"
            case .projects: "folder"
            case .activity: "clock"
            }
        }
    }

    var selection: Section? = .overview
    var inspectorPresented = true
    var query = ""
    var lastAction = "Ready"

    var sampleItems: [DashboardItem] = [
        DashboardItem(title: "Adopt standard toolbar and sidebar surfaces", status: "Ready"),
        DashboardItem(title: "Back toolbar actions with menu commands", status: "Review"),
        DashboardItem(title: "Test tiled halves, thirds, and quadrants", status: "Pending"),
        DashboardItem(title: "Run accessibility and reduced-transparency checks", status: "Pending")
    ]

    var filteredItems: [DashboardItem] {
        let trimmedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else { return sampleItems }
        return sampleItems.filter { item in
            item.title.localizedCaseInsensitiveContains(trimmedQuery)
                || item.status.localizedCaseInsensitiveContains(trimmedQuery)
        }
    }

    func performPrimaryAction() {
        lastAction = "Primary action invoked at \(Date.now.formatted(date: .omitted, time: .standard))"
    }
}

struct DashboardItem: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var status: String
}
