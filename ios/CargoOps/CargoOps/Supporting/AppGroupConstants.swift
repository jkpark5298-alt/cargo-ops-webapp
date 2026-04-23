import Foundation

enum AppGroupConstants {
    static let suiteName = "group.com.yourcompany.cargoops"
    static let widgetConfigKey = "currentFixedWidgetRoom"
    static let fixedRoomsKey = "fixedRooms"
}

enum WidgetConstants {
    static let kind = "FixedSummaryWidget"
    static let defaultRefreshIntervalMinutes = 10
    static let maxWidgetItems = 3
}

enum DeepLinkConstants {
    static let scheme = "cargoops"
    static let fixedHost = "fixed"
}
