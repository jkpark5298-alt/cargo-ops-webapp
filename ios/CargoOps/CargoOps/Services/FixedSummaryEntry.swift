import Foundation
import WidgetKit

struct FixedSummaryEntry: TimelineEntry {
    let date: Date
    let roomId: String
    let roomName: String
    let updatedAt: String
    let items: [FixedWidgetItem]

    init(
        date: Date,
        roomId: String,
        roomName: String,
        updatedAt: String,
        items: [FixedWidgetItem]
    ) {
        self.date = date
        self.roomId = roomId
        self.roomName = roomName
        self.updatedAt = updatedAt
        self.items = items
    }
}

extension FixedSummaryEntry {
    static let placeholder = FixedSummaryEntry(
        date: Date(),
        roomId: FixedWidgetResponse.placeholder.roomId,
        roomName: FixedWidgetResponse.placeholder.roomName,
        updatedAt: FixedWidgetResponse.placeholder.updatedAt,
        items: FixedWidgetResponse.placeholder.items
    )

    static let empty = FixedSummaryEntry(
        date: Date(),
        roomId: "",
        roomName: "FIXED 조회",
        updatedAt: "-",
        items: []
    )
}
