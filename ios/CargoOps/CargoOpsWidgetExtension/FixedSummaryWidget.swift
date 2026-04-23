import SwiftUI
import WidgetKit

struct FixedSummaryWidget: Widget {
    let kind: String = WidgetConstants.kind

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: FixedSummaryTimelineProvider()
        ) { entry in
            FixedSummaryWidgetView(entry: entry)
        }
        .configurationDisplayName("FIXED 조회")
        .description("현재 FIXED ROOM의 편명 3개를 간단히 보여줍니다.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}
