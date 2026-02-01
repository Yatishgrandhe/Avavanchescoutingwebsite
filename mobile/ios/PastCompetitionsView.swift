import SwiftUI
import Supabase

struct PastCompetitionSummary: Codable, Identifiable {
    let id: String
    let competition_name: String?
    let competition_key: String?
    let competition_year: Int?
    let competition_location: String?
}

struct PastCompetitionsView: View {
    @State private var competitions: [PastCompetitionSummary] = []
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
                Text("No past competitions")
                    .foregroundColor(.white.opacity(0.7))
            } else {
                List(competitions, id: \.id) { comp in
                    NavigationLink(destination: PastCompetitionDetailView(competitionId: comp.id)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(comp.competition_name ?? "Unnamed")
                                .font(.headline)
                                .foregroundColor(.white)
                            if let year = comp.competition_year {
                                Text("\(year)")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            if let key = comp.competition_key, !key.isEmpty {
                                Text(key)
                                    .font(.caption2)
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.white.opacity(0.05))
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Past Competitions")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchCompetitions() }
    }
    
    func fetchCompetitions() {
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                var request = URLRequest(url: URL(string: "https://avalanchescouting.vercel.app/api/past-competitions")!)
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    throw NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to load"])
                }
                let decoded = try JSONDecoder().decode(PastCompetitionsResponse.self, from: data)
                await MainActor.run {
                    competitions = decoded.competitions ?? []
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

private struct PastCompetitionsResponse: Codable {
    let competitions: [PastCompetitionSummary]?
}

struct PastCompetitionDetailView: View {
    let competitionId: String
    @State private var detail: PastCompetitionDetail?
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
            } else if let d = detail {
                List {
                    Section(header: Text("Competition").foregroundColor(.white.opacity(0.6))) {
                        Text(d.competition?.competition_name ?? "—")
                            .foregroundColor(.white)
                        if let year = d.competition?.competition_year {
                            Text("Year: \(year)")
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    Section(header: Text("Summary").foregroundColor(.white.opacity(0.6))) {
                        Text("Teams: \(d.teams?.count ?? 0)")
                            .foregroundColor(.white)
                        Text("Matches: \(d.matches?.count ?? 0)")
                            .foregroundColor(.white)
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle(detail?.competition?.competition_name ?? "Competition")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchDetail() }
    }
    
    func fetchDetail() {
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                var components = URLComponents(string: "https://avalanchescouting.vercel.app/api/past-competitions")!
                components.queryItems = [URLQueryItem(name: "id", value: competitionId)]
                var request = URLRequest(url: components.url!)
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    throw NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to load"])
                }
                let decoded = try JSONDecoder().decode(PastCompetitionDetail.self, from: data)
                await MainActor.run {
                    detail = decoded
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

private struct PastCompetitionDetail: Codable {
    let competition: PastCompetitionSummary?
    let teams: [PastTeam]?
    let matches: [PastMatch]?
}

private struct PastTeam: Codable {
    let team_number: Int?
    let team_name: String?
}

private struct PastMatch: Codable {
    let match_id: String?
}
