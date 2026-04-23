import Foundation
import SwiftUI

@MainActor
final class FixedRoomViewModel: ObservableObject {
    @Published var room: FixedRoom?
    @Published var newFlightInput: String = ""
    @Published var autoRefreshEnabled: Bool = true
    @Published var isLoading: Bool = false
    @Published var errorMessage: String = ""
    @Published var statusMessage: String = ""
    @Published var nextRefreshAt: Date?

    private let store: WidgetConfigStore
    private let apiClient: FixedRoomAPIClient
    private let widgetRefreshService: WidgetRefreshService
    private var refreshTask: Task<Void, Never>?

    init(
        store: WidgetConfigStore = WidgetConfigStore(),
        apiClient: FixedRoomAPIClient = FixedRoomAPIClient(),
        widgetRefreshService: WidgetRefreshService = WidgetRefreshService()
    ) {
        self.store = store
        self.apiClient = apiClient
        self.widgetRefreshService = widgetRefreshService
    }

    deinit {
        refreshTask?.cancel()
    }

    func loadRoom(roomId: String) {
        guard let loadedRoom = store.loadFixedRoom(roomId: roomId) else {
            room = nil
            errorMessage = "FIXED ROOM을 찾을 수 없습니다."
            statusMessage = ""
            nextRefreshAt = nil
            stopAutoRefresh()
            return
        }

        room = loadedRoom
        errorMessage = ""
        statusMessage = ""
        persistCurrentRoomToWidgetConfig()
        scheduleNextAutoRefresh()
    }

    func saveCurrentRoom() {
        guard let room else { return }

        do {
            try store.saveFixedRoom(room)
            try store.updateCurrentWidgetRoom(from: room)
        } catch {
            errorMessage = "저장에 실패했습니다."
        }
    }

    func addFlight() {
        guard var currentRoom = room else {
            errorMessage = "선택된 FIXED ROOM이 없습니다."
            return
        }

        let normalized = FlightCodeNormalizer.normalize(newFlightInput)

        guard !normalized.isEmpty else {
            errorMessage = "편명을 입력하세요."
            return
        }

        if currentRoom.flights.contains(normalized) {
            errorMessage = "이미 추가된 편명입니다."
            return
        }

        currentRoom.flights.append(normalized)
        room = currentRoom
        newFlightInput = ""
        errorMessage = ""
        statusMessage = "편명이 추가되었습니다."

        do {
            try store.saveFixedRoom(currentRoom)
            try store.updateCurrentWidgetRoom(from: currentRoom)
        } catch {
            errorMessage = "편명 저장에 실패했습니다."
        }
    }

    func deleteFlight(_ flight: String) {
        guard var currentRoom = room else {
            errorMessage = "선택된 FIXED ROOM이 없습니다."
            return
        }

        currentRoom.flights.removeAll { $0 == flight }
        room = currentRoom
        errorMessage = ""
        statusMessage = "편명이 삭제되었습니다."

        do {
            try store.saveFixedRoom(currentRoom)
            try store.updateCurrentWidgetRoom(from: currentRoom)
        } catch {
            errorMessage = "편명 삭제 저장에 실패했습니다."
        }
    }

    func refreshNow() async {
        guard let currentRoom = room else {
            errorMessage = "선택된 FIXED ROOM이 없습니다."
            return
        }

        if currentRoom.flights.isEmpty {
            errorMessage = "조회할 편명이 없습니다."
            return
        }

        isLoading = true
        errorMessage = ""
        statusMessage = ""

        do {
            let refreshedRoom = try await apiClient.fetchFixedRoomData(room: currentRoom)
            room = refreshedRoom

            try store.saveFixedRoom(refreshedRoom)
            try store.updateCurrentWidgetRoom(from: refreshedRoom)

            widgetRefreshService.reloadFixedSummaryWidget()

            statusMessage = "다시 조회가 완료되었습니다."
            nextRefreshAt = Date().addingTimeInterval(
                TimeInterval(WidgetConstants.defaultRefreshIntervalMinutes * 60)
            )

            if autoRefreshEnabled {
                scheduleNextAutoRefresh()
            }
        } catch {
            errorMessage = error.localizedDescription
            nextRefreshAt = Date().addingTimeInterval(
                TimeInterval(WidgetConstants.defaultRefreshIntervalMinutes * 60)
            )

            if autoRefreshEnabled {
                scheduleNextAutoRefresh()
            }
        }

        isLoading = false
    }

    func pushWidgetUpdate() {
        guard let room else {
            errorMessage = "선택된 FIXED ROOM이 없습니다."
            return
        }

        do {
            try store.updateCurrentWidgetRoom(from: room)
            widgetRefreshService.reloadFixedSummaryWidget()
            statusMessage = "위젯 갱신 요청이 전송되었습니다."
            errorMessage = ""
        } catch {
            errorMessage = "위젯 설정 저장에 실패했습니다."
        }
    }

    func setAutoRefreshEnabled(_ enabled: Bool) {
        autoRefreshEnabled = enabled

        if enabled {
            scheduleNextAutoRefresh()
        } else {
            stopAutoRefresh()
        }
    }

    func handleAppDidBecomeActive() {
        if autoRefreshEnabled {
            scheduleNextAutoRefresh()
        }
    }

    func handleAppWillResignActive() {
        stopAutoRefresh()
    }
}

private extension FixedRoomViewModel {
    func persistCurrentRoomToWidgetConfig() {
        guard let room else { return }

        do {
            try store.updateCurrentWidgetRoom(from: room)
        } catch {
            errorMessage = "위젯 설정 저장에 실패했습니다."
        }
    }

    func scheduleNextAutoRefresh() {
        stopAutoRefresh()

        guard autoRefreshEnabled else {
            nextRefreshAt = nil
            return
        }

        guard room != nil else {
            nextRefreshAt = nil
            return
        }

        let interval = TimeInterval(WidgetConstants.defaultRefreshIntervalMinutes * 60)
        let nextDate = Date().addingTimeInterval(interval)
        nextRefreshAt = nextDate

        refreshTask = Task { [weak self] in
            guard let self else { return }

            do {
                try await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))

                if Task.isCancelled { return }
                if !self.autoRefreshEnabled { return }

                await self.refreshNow()
            } catch {
                return
            }
        }
    }

    func stopAutoRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
        nextRefreshAt = nil
    }
}
