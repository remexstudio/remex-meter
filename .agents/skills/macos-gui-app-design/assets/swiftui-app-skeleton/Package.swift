// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "__MODULE_NAME__",
    platforms: [
        .macOS("__MINIMUM_MACOS__")
    ],
    products: [
        .executable(name: "__MODULE_NAME__", targets: ["__MODULE_NAME__"])
    ],
    targets: [
        .executableTarget(
            name: "__MODULE_NAME__",
            path: "Sources/__MODULE_NAME__"
        ),
        .testTarget(
            name: "__MODULE_NAME__Tests",
            dependencies: ["__MODULE_NAME__"],
            path: "Tests/__MODULE_NAME__Tests"
        )
    ]
)
