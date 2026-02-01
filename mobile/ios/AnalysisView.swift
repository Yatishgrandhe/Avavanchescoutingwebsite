import SwiftUI
import Supabase

enum AnalysisTab: String, CaseIterable {
    case teams = "Teams"
    case data = "Data"
}

struct AnalysisView: View {
    @State private var selectedTab: AnalysisTab = .teams
    @State private var teams: [Team] = []
    @State private var scoutingData: [ScoutingData] = []
    @State private var searchText = ""
    @State private var isLoadingTeams = true
    @State private var isLoadingData = true
    @State private var loadError: String?
    
    private struct AggregatedStat: Identifiable {
        let team: Team
        let matchCount: Int
        let avgAuto: Double
        let avgTeleop: Double
        let avgFinal: Double
        var id: Int { team.team_number }
    }
    
    private var aggregatedTeamStats: [AggregatedStat] {
        let byTeam = Dictionary(grouping: scoutingData, by: { $0.team_number })
        return teams.compactMap { team in
            guard let entries = byTeam[team.team_number], !entries.isEmpty else { return nil }
            let count = entries.count
            let avgAuto = Double(entries.compactMap(\.autonomous_points).reduce(0, +)) / Double(count)
            let avgTeleop = Double(entries.compactMap(\.teleop_points).reduce(0, +)) / Double(count)
            let avgFinal = Double(entries.compactMap(\.final_score).reduce(0, +)) / Double(count)
            return AggregatedStat(team: team, matchCount: count, avgAuto: avgAuto, avgTeleop: avgTeleop, avgFinal: avgFinal)
        }.sorted { $0.team.team_number < $1.team.team_number }
    }
    
    private var filteredData: [ScoutingData] {
        let sorted = scoutingData.sorted { ($0.created_at ?? "") > ($1.created_at ?? "") }
        if searchText.isEmpty { return sorted }
        return sorted.filter {
            $0.team_number.description.contains(searchText) ||
            $0.match_id.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            
            VStack(spacing: 0) {
                Picker("", selection: $selectedTab) {
                    ForEach(AnalysisTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .colorMultiply(.white)
                
                if selectedTab == .data {
                    TextField("Search team or match", text: $searchText)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                }
                
                if let err = loadError {
                    Text(err)
                        .font(.subheadline)
                        .foregroundColor(.orange)
                        .multilineTextAlignment(.center)
                        .padding()
                }
                
                if selectedTab == .teams {
                    if isLoadingTeams {
                        Spacer()
                        ProgressView("Loading teams...")
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .foregroundColor(.white)
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(aggregatedTeamStats) { item in
                                    NavigationLink(destination: TeamDetailView(teamNumber: item.team.team_number)) {
                                        TeamStatCard(
                                            teamName: item.team.team_name,
                                            teamNumber: item.team.team_number,
                                            matchCount: item.matchCount,
                                            avgAuto: Int(round(item.avgAuto)),
                                            avgTeleop: Int(round(item.avgTeleop)),
                                            avgFinal: Int(round(item.avgFinal))
                                        )
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding()
                        }
                    }
                } else {
                    if isLoadingData {
                        Spacer()
                        ProgressView("Loading data...")
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .foregroundColor(.white)
                        Spacer()
                    } else {
                        List {
                            ForEach(filteredData, id: \.stableId) { row in
                                DataRowView(data: row)
                                    .listRowBackground(Color.white.opacity(0.05))
                            }
                        }
                        .listStyle(PlainListStyle())
                        .scrollContentBackground(.hidden)
                    }
                }
            }
        }
        .navigationTitle("Analysis")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            fetchTeams()
            fetchScoutingData()
        }
    }
    
    func fetchTeams() {
        loadError = nil
        Task {
            do {
                let fetched: [Team] = try await SupabaseManager.shared.client
                    .from("teams")
                    .select()
                    .order("team_number", ascending: true)
                    .execute()
                    .value
                await MainActor.run {
                    teams = fetched
                    isLoadingTeams = false
                }
            } catch {
                await MainActor.run {
                    isLoadingTeams = false
                    loadError = error.localizedDescription
                }
                print("[AnalysisView] fetchTeams error: \(error)")
            }
        }
    }
    
    func fetchScoutingData() {
        Task {
            do {
                let fetched: [ScoutingData] = try await SupabaseManager.shared.client
                    .from("scouting_data")
                    .select()
                    .execute()
                    .value
                await MainActor.run {
                    scoutingData = fetched
                    isLoadingData = false
                }
            } catch {
                await MainActor.run {
                    isLoadingData = false
                    if loadError == nil { loadError = error.localizedDescription }
                }
                print("[AnalysisView] fetchScoutingData error: \(error)")
            }
        }
    }
}

struct DataRowView: View {
    let data: ScoutingData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("#\(data.team_number)")
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Text(data.match_id)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("\(data.final_score ?? 0) pts")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.orange)
            }
            HStack(spacing: 16) {
                Text("A: \(data.autonomous_points ?? 0)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                Text("T: \(data.teleop_points ?? 0)")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .padding(.vertical, 8)
    }
}

struct TeamStatCard: View {
    let teamName: String
    let teamNumber: Int
    let matchCount: Int
    let avgAuto: Int
    let avgTeleop: Int
    let avgFinal: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(teamName)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Spacer()
                Text("#\(teamNumber)")
                    .font(.caption)
                    .padding(6)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(6)
                    .foregroundColor(.white)
                Text("\(matchCount) matches")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.6))
            }
            
            HStack(spacing: 20) {
                StatItem(label: "AUTO", value: "\(avgAuto)", color: .blue)
                StatItem(label: "TELE", value: "\(avgTeleop)", color: .orange)
                StatItem(label: "FINAL", value: "\(avgFinal)", color: .green)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

extension ScoutingData {
    var stableId: String { "\(team_number)-\(match_id)" }
}

struct StatItem: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading) {
            Text(label)
                .font(.system(size: 8, weight: .black))
                .foregroundColor(color.opacity(0.8))
            Text(value)
                .font(.system(size: 20, weight: .black))
                .foregroundColor(color)
        }
    }
}
