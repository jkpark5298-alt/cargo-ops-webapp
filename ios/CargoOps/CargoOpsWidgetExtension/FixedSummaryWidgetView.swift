import SwiftUI
import WidgetKit

struct FixedSummaryWidgetView: View {
    let entry: FixedSummaryEntry

    var body: some View {
        ZStack {
            backgroundView

            VStack(alignment: .leading, spacing: 10) {
                headerView

                if entry.items.isEmpty {
                    emptyStateView
                } else {
                    ForEach(Array(entry.items.prefix(WidgetConstants.maxWidgetItems))) { item in
                        rowView(item)

                        if item.id != entry.items.prefix(WidgetConstants.maxWidgetItems).last?.id {
                            Divider()
                                .overlay(Color.white.opacity(0.12))
                        }
                    }

                    Spacer(minLength: 0)
                }
            }
            .padding(16)
        }
        .widgetURL(deepLinkURL)
    }
}

private extension FixedSummaryWidgetView {
    var backgroundView: some View {
        LinearGradient(
            colors: [
                Color(red: 0.04, green: 0.09, blue: 0.18),
                Color(red: 0.03, green: 0.07, blue: 0.14)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var headerView: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("FIXED 조회")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)

                Text(entry.roomName.isEmpty ? "선택된 ROOM 없음" : entry.roomName)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.72))
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text("갱신")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white.opacity(0.65))

                Text(entry.updatedAt)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.9))
                    .lineLimit(1)
            }
        }
    }

    var emptyStateView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Spacer(minLength: 0)

            Text("표시할 FIXED ROOM이 없습니다.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)

            Text("앱에서 FIXED ROOM을 선택한 뒤 위젯을 다시 갱신해 주세요.")
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
    }

    func rowView(_ item: FixedWidgetItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center, spacing: 8) {
                Text(item.flight)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Spacer(minLength: 6)

                Text(item.status)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(statusColor(item.status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(item.status).opacity(0.16))
                    .clipShape(Capsule())
            }

            HStack(spacing: 8) {
                Text("\(item.departureCode)→\(item.arrivalCode)")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.9))
                    .lineLimit(1)

                Spacer(minLength: 6)

                Text(item.displayTime)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
        }
    }

    func statusColor(_ status: String) -> Color {
        switch status {
        case "출발":
            return Color.red
        case "도착":
            return Color.blue
        case "결항":
            return Color.gray
        case "게이트 변경":
            return Color.purple
        case "지연":
            return Color.orange
        default:
            return Color.white.opacity(0.8)
        }
    }

    var deepLinkURL: URL? {
        guard !entry.roomId.isEmpty else { return nil }

        var components = URLComponents()
        components.scheme = "cargoops"
        components.host = "fixed"
        components.queryItems = [
            URLQueryItem(name: "roomId", value: entry.roomId)
        ]
        return components.url
    }
}
