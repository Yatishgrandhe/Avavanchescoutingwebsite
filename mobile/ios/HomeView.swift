import SwiftUI
import Supabase

struct DashboardStats {
    var totalMatches: Int = 0
    var teamsCount: Int = 0
    var dataPoints: Int = 0
    var successRate: Int = 0
}

struct RecentActivityItem: Identifiable {
    let id: String
    let title: String
    let description: String
    let timestamp: String
}

struct HomeView: View {
    @State private var teams: [Team] = []
    @State private var stats = DashboardStats()
    @State private var recentActivity: [RecentActivityItem] = []
    @State private var isLoadingTeams = true
    @State private var isLoadingStats = true
    @State private var isLoadingActivity = true
    @State private var dataError: String?
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "0D1445").ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Logo and welcome
                        VStack(spacing: 8) {
                            Image.avalancheLogo
                                .resizable()
                                .scaledToFit()
                                .frame(width: 64, height: 64)
                            Text("Welcome to Avalanche")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            Text("Professional FRC scouting platform")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        
                        // Quick Actions
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Quick Actions")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.9))
                            
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                NavCard(title: "Scout", subtitle: "Match data", icon: "plus.circle.fill", color: Color(hex: "1A2B7C")) { ScoutView() }
                                NavCard(title: "Analysis", subtitle: "Analytics", icon: "chart.bar.fill", color: Color(hex: "1A2B7C")) { AnalysisView() }
                                NavCard(title: "Pick List", subtitle: "Admin lists", icon: "list.bullet", color: Color(hex: "1A2B7C")) { PickListView() }
                                NavCard(title: "Pit Scouting", subtitle: "Robot info", icon: "wrench.fill", color: Color(hex: "1A2B7C")) { PitScoutingView() }
                                NavCard(title: "Pit Data", subtitle: "Pit records", icon: "doc.text.fill", color: Color(hex: "1A2B7C")) { PitDataView() }
                                NavCard(title: "Past Competitions", subtitle: "History", icon: "calendar", color: Color(hex: "1A2B7C")) { PastCompetitionsView() }
                                NavCard(title: "Learn Game", subtitle: "Rules & scoring", icon: "book.fill", color: Color(hex: "1A2B7C")) { LearnGameView() }
                            }
                        }
                        
                        // Stats
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Statistics")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.9))
                            
                            if isLoadingStats {
                                HStack { Spacer(); ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)); Spacer() }
                                    .padding()
                            } else {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                    StatCard(label: "Matches", value: "\(stats.totalMatches)", color: .orange)
                                    StatCard(label: "Teams", value: "\(stats.teamsCount)", color: .blue)
                                    StatCard(label: "Data Points", value: "\(stats.dataPoints)", color: Color(hex: "5865F2"))
                                    StatCard(label: "Coverage", value: "\(stats.successRate)%", color: .green)
                                }
                            }
                        }
                        
                        // Recent Activity
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Recent Activity")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.9))
                            
                            if isLoadingActivity {
                                HStack { Spacer(); ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)); Spacer() }
                                    .padding()
                            } else if recentActivity.isEmpty {
                                Text("No recent activity")
                                    .foregroundColor(.white.opacity(0.6))
                                    .padding()
                            } else {
                                ForEach(recentActivity) { item in
                                    HStack(alignment: .top, spacing: 12) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.orange)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(item.title)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(.white)
                                            Text(item.description)
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.6))
                                        }
                                        Spacer()
                                        Text(item.timestamp)
                                            .font(.caption2)
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                    .padding(10)
                                    .background(Color.white.opacity(0.06))
                                    .cornerRadius(8)
                                }
                            }
                        }
                        
                        // Teams
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Teams")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.9))
                            
                            if isLoadingTeams {
                                HStack { Spacer(); ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)); Spacer() }
                                    .padding()
                            } else {
                                ForEach(teams.prefix(15), id: \.team_number) { team in
                                    NavigationLink(destination: TeamDetailView(teamNumber: team.team_number)) {
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(team.team_name)
                                                    .font(.subheadline)
                                                    .fontWeight(.medium)
                                                    .foregroundColor(.white)
                                                Text("#\(team.team_number)")
                                                    .font(.caption)
                                                    .foregroundColor(.white.opacity(0.6))
                                            }
                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.5))
                                        }
                                        .padding(10)
                                        .background(Color.white.opacity(0.06))
                                        .cornerRadius(8)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                    }
                    .padding()
                }
                .refreshable {
                    dataError = nil
                    fetchTeams()
                    fetchDashboardStats()
                    fetchRecentActivity()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Image.avalancheLogo
                        .resizable()
                        .scaledToFit()
                        .frame(width: 32, height: 32)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") {
                        Task {
                            try? await SupabaseManager.shared.client.auth.signOut()
                        }
                    }
                    .foregroundColor(.white)
                }
            }
        }
        .onAppear {
            fetchTeams()
            fetchDashboardStats()
            fetchRecentActivity()
        }
    }
    
    func fetchTeams() {
        dataError = nil
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
                    dataError = "Teams: \(error.localizedDescription)"
                }
                print("[HomeView] fetchTeams error: \(error)")
            }
        }
    }
    
    func fetchDashboardStats() {
        Task {
            do {
                let matches: [MatchIdOnly] = try await SupabaseManager.shared.client
                    .from("matches")
                    .select("match_id")
                    .execute()
                    .value
                let teamsCount: [TeamIdOnly] = try await SupabaseManager.shared.client
                    .from("teams")
                    .select("team_number")
                    .execute()
                    .value
                let scouting: [ScoutingMatchId] = try await SupabaseManager.shared.client
                    .from("scouting_data")
                    .select("match_id")
                    .execute()
                    .value
                let totalMatches = matches.count
                let uniqueWithData = Set(scouting.map(\.match_id)).count
                let successRate = totalMatches > 0 ? Int(round(Double(uniqueWithData) / Double(totalMatches) * 100)) : 0
                await MainActor.run {
                    stats = DashboardStats(
                        totalMatches: totalMatches,
                        teamsCount: teamsCount.count,
                        dataPoints: scouting.count,
                        successRate: successRate
                    )
                    isLoadingStats = false
                }
            } catch {
                await MainActor.run { isLoadingStats = false }
            }
        }
    }
    
    func fetchRecentActivity() {
        Task {
            do {
                struct Row: Decodable {
                    let id: String?
                    let team_number: Int
                    let match_id: String
                    let created_at: String?
                    let matches: MatchInfo?
                    let teams: TeamInfo?
                    struct MatchInfo: Decodable { let match_number: Int?; let event_key: String? }
                    struct TeamInfo: Decodable { let team_name: String? }
                }
                let rows: [Row] = try await SupabaseManager.shared.client
                    .from("scouting_data")
                    .select("id,team_number,match_id,created_at,matches(match_number,event_key),teams(team_name)")
                    .order("created_at", ascending: false)
                    .limit(5)
                    .execute()
                    .value
                let items = rows.map { row in
                    RecentActivityItem(
                        id: row.id ?? UUID().uuidString,
                        title: "Match \(row.matches?.match_number.map { String($0) } ?? row.match_id) completed",
                        description: "Team \(row.team_number) – \(row.teams?.team_name ?? "Unknown")",
                        timestamp: timeAgo(from: row.created_at ?? "")
                    )
                }
                await MainActor.run {
                    recentActivity = items
                    isLoadingActivity = false
                }
            } catch {
                await MainActor.run {
                    recentActivity = []
                    isLoadingActivity = false
                    if dataError == nil { dataError = "Activity: \(error.localizedDescription)" }
                }
                print("[HomeView] fetchRecentActivity error: \(error)")
            }
        }
    }
    
    func timeAgo(from iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        if date == nil {
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            date = f.date(from: String(iso.prefix(19)))
        }
        guard let d = date else { return "—" }
        let sec = Int(-d.timeIntervalSinceNow)
        if sec < 60 { return "just now" }
        if sec < 3600 { return "\(sec / 60) min ago" }
        if sec < 86400 { return "\(sec / 3600) hr ago" }
        return "\(sec / 86400) days ago"
    }
}

private struct MatchIdOnly: Decodable { let match_id: String? }
private struct TeamIdOnly: Decodable { let team_number: Int }
private struct ScoutingMatchId: Decodable { let match_id: String }

struct NavCard<Destination: View>: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    @ViewBuilder let destination: () -> Destination
    
    var body: some View {
        NavigationLink(destination: destination()) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.orange)
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.6))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color.white.opacity(0.08))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct StatCard: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.08))
        .cornerRadius(12)
    }
}
