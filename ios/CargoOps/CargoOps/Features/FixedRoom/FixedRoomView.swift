import SwiftUI

struct FixedRoomView: View {
    @StateObject private var viewModel = FixedRoomViewModel()

    let roomId: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerSection
                flightListSection
                addFlightSection
                actionSection
                resultSection
            }
            .padding(20)
        }
        .navigationTitle("FIXED ROOM")
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(.systemGroupedBackground))
        .onAppear {
            viewModel.loadRoom(roomId: roomId)
            viewModel.handleAppDidBecomeActive()
        }
        .onDisappear {
            viewModel.handleAppWillResignActive()
        }
    }
}

private extension FixedRoomView {
    var headerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let room = viewModel.room {
                Text(room.roomName)
                    .font(.title3)
                    .fontWeight(.bold)

                Text("ROOM ID: \(room.id)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if !room.lastFetchedAt.isEmpty {
                    Text("마지막 조회: \(room.lastFetchedAt)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let nextRefreshAt = viewModel.nextRefreshAt {
                    Text("다음 갱신: \(formattedDate(nextRefreshAt))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("FIXED ROOM 없음")
                    .font(.title3)
                    .fontWeight(.bold)
            }

            Toggle("자동 갱신 (10분)", isOn: Binding(
                get: { viewModel.autoRefreshEnabled },
                set: { viewModel.setAutoRefreshEnabled($0) }
            ))
            .toggleStyle(.switch)

            if !viewModel.statusMessage.isEmpty {
                Text(viewModel.statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.blue)
            }

            if !viewModel.errorMessage.isEmpty {
                Text(viewModel.errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    var flightListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("현재 편명 목록")
                .font(.headline)

            if let room = viewModel.room, !room.flights.isEmpty {
                ForEach(room.flights, id: \.self) { flight in
                    HStack {
                        Text(flight)
                            .font(.body.monospaced())
                            .fontWeight(.medium)

                        Spacer()

                        Button(role: .destructive) {
                            viewModel.deleteFlight(flight)
                        } label: {
                            Text("삭제")
                                .font(.subheadline)
                        }
                    }
                    .padding(.vertical, 6)

                    Divider()
                }
            } else {
                Text("편명이 없습니다.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    var addFlightSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("편명 추가")
                .font(.headline)

            TextField("예: 247 또는 KJ247", text: $viewModel.newFlightInput)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .padding(12)
                .background(Color(.tertiarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Text("숫자만 입력 시 KJ 자동 인식")
                .font(.caption)
                .foregroundStyle(.secondary)

            Button {
                viewModel.addFlight()
            } label: {
                Text("추가")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    var actionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("작업")
                .font(.headline)

            HStack(spacing: 12) {
                Button {
                    Task {
                        await viewModel.refreshNow()
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("다시 조회")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isLoading)

                Button {
                    viewModel.pushWidgetUpdate()
                } label: {
                    Text("위젯 갱신")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    var resultSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("조회 결과")
                .font(.headline)

            if let room = viewModel.room, !room.rows.isEmpty {
                VStack(spacing: 10) {
                    ForEach(room.rows) { row in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(row.flight)
                                    .font(.headline)

                                Spacer()

                                Text(row.status)
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(statusColor(row.status).opacity(0.14))
                                    .foregroundStyle(statusColor(row.status))
                                    .clipShape(Capsule())
                            }

                            HStack {
                                Text("\(row.departureCode) → \(row.arrivalCode)")
                                    .font(.subheadline.monospaced())
                                    .foregroundStyle(.secondary)

                                Spacer()

                                Text(row.displayChangedTime)
                                    .font(.subheadline.monospaced())
                            }

                            HStack {
                                Text("게이트: \(row.gate)")
                                Spacer()
                                Text("등록기호: \(row.registrationNo)")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(14)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            } else {
                Text("조회 결과가 없습니다.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.timeZone = TimeZone(identifier: "Asia/Seoul")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }

    func statusColor(_ status: String) -> Color {
        switch status {
        case "출발":
            return .red
        case "도착":
            return .blue
        case "결항":
            return .gray
        case "게이트 변경":
            return .purple
        case "지연":
            return .orange
        default:
            return .secondary
        }
    }
}
