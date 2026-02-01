import SwiftUI
import Supabase

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
                        DetailRow(label: "Team", value: "#\(r.team_number)")
                        DetailRow(label: "Robot name", value: r.robot_name ?? "—")
                        DetailRow(label: "Drive type", value: r.drive_type ?? "—")
                        if let notes = r.notes, !notes.isEmpty {
                            DetailRow(label: "Notes", value: notes)
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

struct DetailRow: View {
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
