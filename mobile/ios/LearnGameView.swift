import SwiftUI

struct LearnGameView: View {
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Game Overview")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("FIRST Robotics Competition: REBUILT presented by Haas is the 2026 FRC game. Teams compete in alliances of three robots each, working together to score points by placing FUEL in HUBs and climbing the TOWER.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                    Text("Match Duration: Autonomous (first 20 seconds) followed by Teleop (last 2:20). Endgame is the last 30 seconds.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                    
                    Text("Scoring")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("• FUEL in active HUB: 1 point per FUEL (AUTO or TELEOP). During Endgame both HUBs are active.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                    Text("• AUTO TOWER (first 20 sec): LEVEL 1 climb per robot: 15 points.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                    Text("• TELEOP/END GAME TOWER: LEVEL 2 = 20 pts (above LOW RUNG). LEVEL 3 = 30 pts (above MID RUNG). Each robot earns points for only one level.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                    
                    Text("Autonomous Period")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("First 20 seconds. Robots operate without driver control. Score FUEL and climb LEVEL 1 for 15 pts per robot.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                    
                    Text("Teleop & Endgame")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("Last 2:20 of the match. Drivers control robots. Last 30 seconds = Endgame; both HUBs active. TOWER points evaluated ~3 seconds after match end.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding()
            }
        }
        .navigationTitle("Learn the Game")
        .navigationBarTitleDisplayMode(.inline)
    }
}
