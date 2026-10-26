import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model

        NavigationSplitView {
            List(AppModel.Section.allCases, selection: $model.selection) { section in
                Label(section.title, systemImage: section.symbolName)
                    .tag(section)
            }
            .navigationTitle("__APP_NAME__")
            .navigationSplitViewColumnWidth(min: 180, ideal: 220, max: 280)
        } detail: {
            ContentView(section: model.selection ?? .overview)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .inspector(isPresented: $model.inspectorPresented) {
            InspectorView(section: model.selection ?? .overview)
                .inspectorColumnWidth(min: 240, ideal: 300, max: 420)
        }
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    model.performPrimaryAction()
                } label: {
                    Label("Run", systemImage: "play.fill")
                }
                .help("Run the primary action")

                Toggle(isOn: $model.inspectorPresented) {
                    Label("Inspector", systemImage: "sidebar.right")
                }
                .help("Show or hide the inspector")
            }
        }
        .searchable(text: $model.query, placement: .toolbar, prompt: "Search __APP_NAME__")
        .focusedValue(\.primaryAction) {
            model.performPrimaryAction()
        }
        .frame(minWidth: 720, minHeight: 480)
    }
}

private struct ContentView: View {
    @Environment(AppModel.self) private var model
    let section: AppModel.Section

    var body: some View {
        switch section {
        case .overview:
            OverviewView()
        case .projects:
            ItemListView(title: "Projects")
        case .activity:
            ItemListView(title: "Activity")
        }
    }
}

private struct OverviewView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Modern Mac app baseline")
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                Text("Use this starter as a standard sidebar/content/inspector shell. Replace sample data with the product model, then keep commands, settings, accessibility, and distribution checks explicit.")
                    .foregroundStyle(.secondary)
            }

            Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 12) {
                GridRow {
                    Label("Standard surfaces", systemImage: "rectangle.split.3x1")
                    Text("Sidebar, toolbar, searchable content, inspector, settings, and menu commands.")
                }
                GridRow {
                    Label("Window-ready", systemImage: "rectangle.inset.filled")
                    Text("Resizable shell with a minimum size intended for tiled windows.")
                }
                GridRow {
                    Label("Future-facing", systemImage: "sparkles")
                    Text("Avoid fake materials and custom chrome unless the product need is documented.")
                }
            }

            Divider()

            ItemListView(title: "Implementation checks")
        }
        .padding(28)
    }
}

private struct ItemListView: View {
    @Environment(AppModel.self) private var model
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)

            List(model.filteredItems) { item in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.title)
                        Text(item.status)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(item.status)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.thinMaterial, in: Capsule())
                }
                .accessibilityElement(children: .combine)
            }
            .accessibilityLabel("\(title) list")
        }
        .padding(24)
    }
}

private struct InspectorView: View {
    @Environment(AppModel.self) private var model
    let section: AppModel.Section

    var body: some View {
        Form {
            Section("Selection") {
                LabeledContent("Section", value: section.title)
                LabeledContent("Visible items", value: "\(model.filteredItems.count)")
            }

            Section("State") {
                LabeledContent("Last action", value: model.lastAction)
                Text("Use inspectors for contextual properties. Put global preferences in Settings, not in this column.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

#Preview {
    RootView()
        .environment(AppModel())
}
