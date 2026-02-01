import SwiftUI
import Supabase

struct PastTeamEntry: Codable {
    let id: String?
    let competition_id: String?
    let team_number: Int
    let team_name: String?
}

struct PastCompetitionEntry: Codable, Identifiable {
    let id: String
    let competition_name: String?
    let competition_key: String?
    let competition_year: Int?
}

struct TeamHistoryView: View {
    let teamNumber: Int
    @State private var competitions: [PastCompetitionEntry] = []
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
            } else if competitions.isEmpty {
                Text("No past competition history for this team")
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            } else {
                List(competitions, id: \.id) { comp in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(comp.competition_name ?? "Unnamed")
                            .font(.headline)
                            .foregroundColor(.white)
                        if let year = comp.competition_year {
                            Text("\(year)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                    .padding(.vertical, 8)
                    .listRowBackground(Color.white.opacity(0.05))
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Team #\(teamNumber) History")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchHistory() }
    }
    
    func fetchHistory() {
        Task {
            do {
                let pastTeams: [PastTeamEntry] = try await SupabaseManager.shared.client
                    .from("past_teams")
                    .select()
                    .eq("team_number", value: teamNumber)
                    .execute()
                    .value
                let compIds = pastTeams.compactMap { $0.competition_id }.filter { !$0.isEmpty }
                if compIds.isEmpty {
                    await MainActor.run {
                        competitions = []
                        isLoading = false
                    }
                    return
                }
                let allComps: [PastCompetitionEntry] = try await SupabaseManager.shared.client
                    .from("past_competitions")
                    .select()
                    .execute()
                    .value
                let comps = allComps.filter { compIds.contains($0.id) }
                await MainActor.run {
                    competitions = comps.sorted { ($0.competition_year ?? 0) > ($1.competition_year ?? 0) }
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
