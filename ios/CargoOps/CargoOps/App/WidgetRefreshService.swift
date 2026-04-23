import Foundation
import WidgetKit

struct WidgetRefreshService {
    func reloadFixedSummaryWidget() {
        WidgetCenter.shared.reloadTimelines(ofKind: WidgetConstants.kind)
    }

    func reloadAllWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
