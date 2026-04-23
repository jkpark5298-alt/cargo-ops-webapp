import Foundation

enum AppRoute: Equatable {
    case fixedRoom(roomId: String)
}

struct DeepLinkRouter {
    func resolve(url: URL) -> AppRoute? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }

        guard components.scheme?.lowercased() == DeepLinkConstants.scheme else {
            return nil
        }

        guard components.host?.lowercased() == DeepLinkConstants.fixedHost else {
            return nil
        }

        guard let roomId = components.queryItems?
            .first(where: { $0.name == "roomId" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              !roomId.isEmpty else {
            return nil
        }

        return .fixedRoom(roomId: roomId)
    }
}
