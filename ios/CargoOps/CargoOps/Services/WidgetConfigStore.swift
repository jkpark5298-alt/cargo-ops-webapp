import Foundation

struct WidgetConfigStore {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults? = UserDefaults(suiteName: AppGroupConstants.suiteName)) {
        self.userDefaults = userDefaults ?? .standard
    }

    func saveCurrentWidgetRoom(_ config: WidgetRoomConfig) throws {
        let data = try JSONEncoder().encode(config)
        userDefaults.set(data, forKey: AppGroupConstants.widgetConfigKey)
    }

    func loadCurrentWidgetRoom() -> WidgetRoomConfig? {
        guard let data = userDefaults.data(forKey: AppGroupConstants.widgetConfigKey) else {
            return nil
        }

        return try? JSONDecoder().decode(WidgetRoomConfig.self, from: data)
    }

    func clearCurrentWidgetRoom() {
        userDefaults.removeObject(forKey: AppGroupConstants.widgetConfigKey)
    }

    func saveFixedRooms(_ rooms: [FixedRoom]) throws {
        let data = try JSONEncoder().encode(rooms)
        userDefaults.set(data, forKey: AppGroupConstants.fixedRoomsKey)
    }

    func loadFixedRooms() -> [FixedRoom] {
        guard let data = userDefaults.data(forKey: AppGroupConstants.fixedRoomsKey) else {
            return []
        }

        return (try? JSONDecoder().decode([FixedRoom].self, from: data)) ?? []
    }

    func saveFixedRoom(_ room: FixedRoom) throws {
        var rooms = loadFixedRooms()

        if let index = rooms.firstIndex(where: { $0.id == room.id }) {
            rooms[index] = room
        } else {
            rooms.append(room)
        }

        try saveFixedRooms(rooms)
    }

    func loadFixedRoom(roomId: String) -> FixedRoom? {
        loadFixedRooms().first(where: { $0.id == roomId })
    }

    func deleteFixedRoom(roomId: String) throws {
        let rooms = loadFixedRooms().filter { $0.id != roomId }
        try saveFixedRooms(rooms)

        if loadCurrentWidgetRoom()?.roomId == roomId {
            clearCurrentWidgetRoom()
        }
    }

    func updateCurrentWidgetRoom(from room: FixedRoom) throws {
        try saveCurrentWidgetRoom(room.widgetConfig)
    }
}
