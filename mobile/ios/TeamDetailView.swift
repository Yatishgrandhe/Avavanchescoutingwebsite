import SwiftUI
import Supabase

struct TeamDetailView: View {
    let teamNumber: Int
    @State private var matchHistory: [ScoutingData] = []
    @State private var isLoading = true
    
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            
            if isLoading {
                ProgressView()
                    .foregroundColor(.white)
            } else {
                List {
                    Section {
                        NavigationLink(destination: TeamHistoryView(teamNumber: teamNumber)) {
                            Label("Past competitions & history", systemImage: "clock.arrow.circlepath")
                                .foregroundColor(.white)
                        }
                        .listRowBackground(Color.white.opacity(0.05))
                    }
                    Section(header: Text("Match history").foregroundColor(.white.opacity(0.6))) {
                        ForEach(matchHistory, id: \.match_id) { match in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Match \(match.match_id)")
                                .fontWeight(.bold)
                            Spacer()
                            Text("\(match.final_score ?? 0) PTS")
                                .foregroundColor(.primary)
                                .fontWeight(.black)
                        }
                        
                        Text(match.notes ?? "")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                            .lineLimit(2)
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(Color.white.opacity(0.05))
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Team #\(teamNumber)")
        .onAppear {
            fetchMatchHistory()
        }
    }
    
    func fetchMatchHistory() {
        Task {
            do {
                let history: [ScoutingData] = try await SupabaseManager.shared.client
                    .from("scouting_data")
                    .select()
                    .eq("team_number", value: teamNumber)
                    .order("match_id", ascending: false)
                    .execute()
                    .value
                
                await MainActor.run {
                    self.matchHistory = history
                    self.isLoading = false
                }
            } catch {
                print("Error: \(error)")
                await MainActor.run { isLoading = false }
            }
        }
    }
}
