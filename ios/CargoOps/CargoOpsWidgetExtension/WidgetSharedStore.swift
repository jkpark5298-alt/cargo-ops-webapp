import Foundation

struct WidgetSharedStore {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults? = UserDefaults(suiteName: AppGroupConstants.suiteName)) {
        self.userDefaults = userDefaults ?? .standard
    }

    func loadCurrentWidgetRoom() -> WidgetRoomConfig? {
        guard let data = userDefaults.data(forKey: AppGroupConstants.widgetConfigKey) else {
            return nil
        }

        return try? JSONDecoder().decode(WidgetRoomConfig.self, from: data)
    }
}
