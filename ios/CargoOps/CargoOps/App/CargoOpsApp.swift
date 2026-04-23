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
                    FixedRoomView(roomId: roomId)

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

            Text("위젯 또는 FIXED ROOM 화면에서 진입하면 해당 편명 관리 화면이 열립니다.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
