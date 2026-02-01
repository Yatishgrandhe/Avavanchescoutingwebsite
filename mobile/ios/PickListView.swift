import SwiftUI
import Supabase

struct PickListSummary: Codable, Identifiable {
    let id: String
    let name: String?
    let event_key: String?
    let updated_at: String?
}

struct PickListDetail: Codable {
    let id: String
    let name: String?
    let event_key: String?
    let teams: [PickListTeam]?
}

struct PickListTeam: Codable {
    let team_number: Int
    let team_name: String?
    let pick_order: Int?
    let notes: String?
}

struct PickListView: View {
    @State private var pickLists: [PickListSummary] = []
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
            } else if pickLists.isEmpty {
                Text("No pick lists yet")
                    .foregroundColor(.white.opacity(0.7))
            } else {
                List(pickLists, id: \.id) { pl in
                    NavigationLink(destination: PickListDetailView(pickListId: pl.id)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(pl.name ?? "Unnamed")
                                .font(.headline)
                                .foregroundColor(.white)
                            if let key = pl.event_key, !key.isEmpty {
                                Text(key)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.6))
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
        .navigationTitle("Pick List")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchPickLists() }
    }
    
    func fetchPickLists() {
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                var request = URLRequest(url: URL(string: "https://avalanchescouting.vercel.app/api/pick-lists")!)
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    throw NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to load pick lists"])
                }
                let decoded = try JSONDecoder().decode(PickListsResponse.self, from: data)
                await MainActor.run {
                    pickLists = decoded.pickLists ?? []
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

private struct PickListsResponse: Codable {
    let pickLists: [PickListSummary]?
}

struct PickListDetailView: View {
    let pickListId: String
    @State private var detail: PickListDetail?
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
                    Section(header: Text("Event").foregroundColor(.white.opacity(0.6))) {
                        Text(d.event_key ?? "—")
                            .foregroundColor(.white)
                    }
                    Section(header: Text("Teams").foregroundColor(.white.opacity(0.6))) {
                        ForEach(Array((d.teams ?? []).sorted { ($0.pick_order ?? 0) < ($1.pick_order ?? 0) }.enumerated()), id: \.offset) { idx, team in
                            HStack {
                                Text("\(idx + 1).")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 24, alignment: .leading)
                                Text(team.team_name ?? "Team \(team.team_number)")
                                    .foregroundColor(.white)
                                Spacer()
                                Text("#\(team.team_number)")
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            .listRowBackground(Color.white.opacity(0.05))
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle(detail?.name ?? "Pick List")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fetchDetail() }
    }
    
    func fetchDetail() {
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                var components = URLComponents(string: "https://avalanchescouting.vercel.app/api/pick-lists")!
                components.queryItems = [URLQueryItem(name: "id", value: pickListId)]
                var request = URLRequest(url: components.url!)
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                    throw NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to load pick list"])
                }
                let decoded = try JSONDecoder().decode(PickListDetail.self, from: data)
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
