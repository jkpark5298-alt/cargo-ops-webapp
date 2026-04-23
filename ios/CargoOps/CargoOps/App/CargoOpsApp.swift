import SwiftUI

@main
struct CargoOpsApp: App {
    @State private var currentRoute: AppRoute?
    private let deepLinkRouter = DeepLinkRouter()

    var body: some Scene {
        WindowGroup {
            RootContainerView(currentRoute: $currentRoute)
                .onOpenURL { url in
                    if let route = deepLinkRouter.resolve(url: url) {
                        currentRoute = route
                    }
                }
        }
    }
}

private struct RootContainerView: View {
    @Binding var currentRoute: AppRoute?

    var body: some View {
        NavigationStack {
            Group {
                switch currentRoute {
                case .fixedRoom(let roomId):
                    FixedRoomPlaceholderView(
                        roomId: roomId,
                        onResetRoute: {
                            currentRoute = nil
                        }
                    )

                case .none:
                    HomePlaceholderView()
                }
            }
            .navigationTitle("CargoOps")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct HomePlaceholderView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "airplane")
                .font(.system(size: 40))
                .foregroundStyle(.blue)

            Text("CargoOps")
                .font(.title2)
                .fontWeight(.bold)

            Text("다음 단계에서 FIXED ROOM 관리 화면을 연결합니다.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

private struct FixedRoomPlaceholderView: View {
    let roomId: String
    let onResetRoute: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "pin.fill")
                .font(.system(size: 36))
                .foregroundStyle(.orange)

            Text("FIXED ROOM 진입")
                .font(.title3)
                .fontWeight(.bold)

            Text("roomId")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(roomId)
                .font(.body.monospaced())
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            Text("다음 단계에서 이 화면을 실제 FIXED ROOM 관리 화면으로 교체합니다.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            Button("홈으로") {
                onResetRoute()
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
