# Source map and monitoring list

Checked: 2026-04-30.

This file gives agents a compact map of source categories to consult before updating the skill. Prefer primary sources. Treat version numbers, support matrices, framework maturity, App Store rules, and release tooling as time-sensitive.

## Skill format standards

| Topic | Source |
|---|---|
| Codex Agent Skills structure, activation, locations, optional `agents/openai.yaml` | https://developers.openai.com/codex/skills |
| Open Agent Skills specification: `SKILL.md`, frontmatter, optional dirs, progressive disclosure, validation | https://agentskills.io/specification |
| Codex `AGENTS.md` discovery and precedence | https://developers.openai.com/codex/guides/agents-md |
| General AGENTS.md convention | https://agents.md/ |

## Apple design and platform sources

| Topic | Source |
|---|---|
| Apple Human Interface Guidelines | https://developer.apple.com/design/human-interface-guidelines |
| Menu bar guidance | https://developer.apple.com/design/human-interface-guidelines/the-menu-bar |
| Layout and tiled window guidance | https://developer.apple.com/design/human-interface-guidelines/layout |
| Toolbars | https://developer.apple.com/design/human-interface-guidelines/toolbars |
| Sidebars | https://developer.apple.com/design/human-interface-guidelines/sidebars |
| Split views | https://developer.apple.com/design/human-interface-guidelines/split-views |
| Search fields/searching | https://developer.apple.com/design/human-interface-guidelines/search-fields and https://developer.apple.com/design/human-interface-guidelines/searching |
| Keyboards | https://developer.apple.com/design/human-interface-guidelines/keyboards |
| Accessibility | https://developer.apple.com/design/human-interface-guidelines/accessibility |
| macOS developer overview | https://developer.apple.com/macos/ |
| Latest macOS versions | https://support.apple.com/en-us/109033 |
| macOS Tahoe 26 overview | https://www.apple.com/newsroom/2025/06/macos-tahoe-26-makes-the-mac-more-capable-productive-and-intelligent-than-ever/ |
| Liquid Glass overview/adoption | https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass |
| SwiftUI overview | https://developer.apple.com/swiftui/ |
| SwiftUI new design / what's new | https://developer.apple.com/swiftui/whats-new/ |
| AppKit documentation | https://developer.apple.com/documentation/appkit |
| SwiftUI/AppKit integration | https://developer.apple.com/documentation/swiftui/appkit-integration |
| SwiftUI `NavigationSplitView` | https://developer.apple.com/documentation/SwiftUI/NavigationSplitView |
| SwiftUI inspector | https://developer.apple.com/documentation/SwiftUI/View/inspector%28isPresented%3Acontent%3A%29 |
| SwiftUI `MenuBarExtra` | https://developer.apple.com/documentation/SwiftUI/MenuBarExtra |
| App Intents | https://developer.apple.com/documentation/appintents |
| SMAppService | https://developer.apple.com/documentation/servicemanagement/smappservice |
| App Sandbox | https://developer.apple.com/documentation/security/app-sandbox |
| Notarization | https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution |
| Xcode release notes | https://developer.apple.com/documentation/xcode-release-notes |
| macOS release notes | https://developer.apple.com/documentation/macos-release-notes |

## WWDC sessions to monitor

| Topic | Source |
|---|---|
| Build a SwiftUI app with the new design | https://developer.apple.com/videos/play/wwdc2025/323/ |
| Build an AppKit app with the new design | https://developer.apple.com/videos/play/wwdc2025/310/ |
| Meet Liquid Glass | https://developer.apple.com/videos/play/wwdc2025/219/ |
| Get to know the new design system | https://developer.apple.com/videos/play/wwdc2025/356/ |
| What's new in AppKit, Sequoia-era | https://developer.apple.com/videos/play/wwdc2024/10124/ |
| What’s new in SwiftUI | https://developer.apple.com/videos/play/wwdc2025/256/ |
| Develop for Shortcuts and Spotlight with App Intents | https://developer.apple.com/videos/play/wwdc2025/ |
| Make your Mac app more accessible to everyone | https://developer.apple.com/videos/wwdc2025/ |

## Cross-platform framework sources

| Stack | Source |
|---|---|
| Electron | https://electronjs.org/ and https://electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide |
| Tauri | https://v2.tauri.app/ and https://v2.tauri.app/distribute/sign/macos/ |
| Wails | https://wails.io/docs/introduction/ and https://wails.io/docs/guides/signing/ |
| Qt macOS | https://doc.qt.io/qt-6/macos.html and https://doc.qt.io/qt-6/macos-deployment.html |
| Flutter macOS | https://docs.flutter.dev/deployment/macos and https://api.flutter.dev/flutter/widgets/PlatformMenuBar-class.html |
| Compose Multiplatform desktop | https://kotlinlang.org/docs/multiplatform/compose-desktop-components.html |
| Avalonia macOS | https://docs.avaloniaui.net/docs/platform-specific-guides/macos |
| React Native macOS | https://microsoft.github.io/react-native-macos/ |
| Slint | https://slint.dev/ |
| Fyne | https://fyne.io/ |
| iced | https://iced.rs/ |
| egui | https://www.egui.rs/ |

## Apps worth studying

| App | What to study | Source |
|---|---|---|
| NetNewsWire | Native sidebar/list/content information architecture | https://netnewswire.com/ |
| CotEditor | Lightweight native document/editor conventions | https://coteditor.com/ |
| IINA | Modern media UI and custom chrome tradeoffs | https://iina.io/ |
| Maccy | Focused menu bar/clipboard workflow | https://maccy.app/ |
| Stats | Status item monitoring, settings-heavy utility | https://mac-stats.com/ |
| Ice | Menu bar management and status-item constraints | https://icemenubar.app/ |
| Rectangle | Window utility permissions/hotkeys/menu behavior | https://rectangleapp.com/ |
| KeepingYouAwake | Simple status menu utility | https://keepingyouawake.app/ |
| Raycast/Alfred | Command-center launcher patterns | https://www.raycast.com/ and https://www.alfredapp.com/ |
| Nova | Native developer tool layout | https://nova.app/ |
| Tower | Native Git client, dense developer workflow | https://www.git-tower.com/ |
| TablePlus | Database client, tabs/table editing/query layouts | https://tableplus.com/ |
| CleanShot X | Capture utility, HUD/menu coordination | https://cleanshot.com/ |

## Watch list

- macOS 26.x/27 Liquid Glass behavior, especially sidebar/toolbars, contrast, custom glass APIs, and menu bar extra behavior.
- SwiftUI coverage for advanced tables/outlines, rich text, command routing, menu validation, window management, and AppKit scene interoperability.
- App Intents/Spotlight becoming a more central command surface.
- Mac App Store review behavior for helper tools, automation, JIT, web runtimes, network extensions, and broad filesystem access.
- Cross-platform framework signing/notarization guides for new macOS releases.
- Accessibility expectations around translucent/dynamic materials.
