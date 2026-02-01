import SwiftUI
import Supabase

struct PitDataView: View {
    @State private var pitData: [PitScoutingRecord] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            if isLoading {
                ProgressView("Loading...")
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .foregroundColor(.white)
            } else if let err = errorMessage {
                VStack(spacing: 16) {
                    Text(err)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }
            } else {
                List(pitData, id: \.stableId) { record in
                    NavigationLink(destination: PitDetailView(recordId: record.id)) {
                        PitDataRowView(record: record)
                    }
                    .listRowBackground(Color.white.opacity(0.05))
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Pit Scouting Data")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchPitData() }
    }
    
    func fetchPitData() {
        Task {
            do {
                let fetched: [PitScoutingRecord] = try await SupabaseManager.shared.client
                    .from("pit_scouting_data")
                    .select()
                    .order("created_at", ascending: false)
                    .execute()
                    .value
                await MainActor.run {
                    pitData = fetched
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

struct PitDataRowView: View {
    let record: PitScoutingRecord
    
    var body: some View {
        HStack(spacing: 12) {
            RobotThumbnailView(url: record.robot_image_url)
                .frame(width: 56, height: 56)
                .cornerRadius(8)
            VStack(alignment: .leading, spacing: 4) {
                Text("Team #\(record.team_number)")
                    .font(.headline)
                    .foregroundColor(.white)
                Text(record.robot_name ?? "—")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
                if let drive = record.drive_type, !drive.isEmpty {
                    Text(drive)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            Spacer()
        }
        .padding(.vertical, 8)
    }
}

struct RobotThumbnailView: View {
    let url: String?
    
    var body: some View {
        Group {
            if let urlStr = url, !urlStr.isEmpty, let u = URL(string: urlStr) {
                AsyncImage(url: u) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        Text("Failed to load")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.6))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    @unknown default:
                        EmptyView()
                    }
                }
            } else {
                Text("No image")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Color.white.opacity(0.1))
    }
}

extension PitScoutingRecord {
    var stableId: String { id ?? "\(team_number)-\(created_at ?? "")" }
}

// MARK: - Pit Detail (inlined so compiler resolves type when path contains spaces)
struct PitDetailView: View {
    let recordId: String?
    @State private var record: PitScoutingRecord?
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            if isLoading {
                ProgressView("Loading...")
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .foregroundColor(.white)
            } else if let err = errorMessage {
                Text(err)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            } else if let r = record {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let urlStr = r.robot_image_url, !urlStr.isEmpty, let u = URL(string: urlStr) {
                            AsyncImage(url: u) { phase in
                                switch phase {
                                case .empty:
                                    ProgressView()
                                        .frame(height: 200)
                                        .frame(maxWidth: .infinity)
                                case .success(let image):
                                    image.resizable().scaledToFit().frame(maxHeight: 280)
                                case .failure:
                                    Text("Failed to load image")
                                        .foregroundColor(.white.opacity(0.7))
                                        .frame(height: 120)
                                        .frame(maxWidth: .infinity)
                                @unknown default:
                                    EmptyView()
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(12)
                        } else {
                            Text("No robot image available")
                                .foregroundColor(.white.opacity(0.6))
                                .frame(height: 120)
                                .frame(maxWidth: .infinity)
                                .background(Color.white.opacity(0.06))
                                .cornerRadius(12)
                        }
                        PitDetailRowView(label: "Team", value: "#\(r.team_number)")
                        PitDetailRowView(label: "Robot name", value: r.robot_name ?? "—")
                        PitDetailRowView(label: "Drive type", value: r.drive_type ?? "—")
                        if let notes = r.notes, !notes.isEmpty {
                            PitDetailRowView(label: "Notes", value: notes)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Pit Detail")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if let id = recordId, !id.isEmpty { fetchDetail(id: id) }
            else { errorMessage = "Invalid record" }
        }
    }
    
    func fetchDetail(id: String) {
        Task {
            do {
                let fetched: PitScoutingRecord = try await SupabaseManager.shared.client
                    .from("pit_scouting_data")
                    .select()
                    .eq("id", value: id)
                    .single()
                    .execute()
                    .value
                await MainActor.run {
                    record = fetched
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

private struct PitDetailRowView: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
            Text(value)
                .font(.body)
                .foregroundColor(.white)
        }
    }
}
