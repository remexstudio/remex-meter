import XCTest
@testable import __MODULE_NAME__

@MainActor
final class __MODULE_NAME__Tests: XCTestCase {
    func testFilteringMatchesTitleAndStatus() {
        let model = AppModel()
        model.query = "toolbar"
        XCTAssertEqual(model.filteredItems.count, 1)
        XCTAssertTrue(model.filteredItems[0].title.localizedCaseInsensitiveContains("toolbar"))

        model.query = "pending"
        XCTAssertGreaterThanOrEqual(model.filteredItems.count, 1)
    }

    func testPrimaryActionUpdatesState() {
        let model = AppModel()
        XCTAssertEqual(model.lastAction, "Ready")
        model.performPrimaryAction()
        XCTAssertNotEqual(model.lastAction, "Ready")
    }
}
