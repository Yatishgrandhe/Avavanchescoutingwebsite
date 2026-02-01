import SwiftUI
import Supabase

struct ScoutView: View {
    @State private var teamNumber: String = ""
    @State private var matchNumber: String = ""
    @State private var allianceColor: String = "Red"
    
    // Scoring State
    @State private var autoPoints: Int = 0
    @State private var teleopPoints: Int = 0
    @State private var endgamePoints: Int = 0
    @State private var notes: String = ""
    
    @State private var isSubmitting = false
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    let alliances = ["Red", "Blue"]
    
    var body: some View {
        Form {
            Section(header: Text("Match Information").foregroundColor(.orange)) {
                TextField("Team Number", text: $teamNumber)
                    .keyboardType(.numberPad)
                TextField("Match Number", text: $matchNumber)
                    .keyboardType(.numberPad)
                Picker("Alliance Color", selection: $allianceColor) {
                    ForEach(alliances, id: \.self) { color in
                        Text(color).tag(color)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
            }
            .listRowBackground(Color.white.opacity(0.05))
            
            Section(header: Text("Scoring").foregroundColor(.blue)) {
                Stepper("Autonomous: \(autoPoints) pts", value: $autoPoints, in: 0...100)
                Stepper("Teleop: \(teleopPoints) pts", value: $teleopPoints, in: 0...200)
                Stepper("Endgame: \(endgamePoints) pts", value: $endgamePoints, in: 0...100)
            }
            .listRowBackground(Color.white.opacity(0.05))
            
            Section(header: Text("Post-Match").foregroundColor(.green)) {
                TextEditor(text: $notes)
                    .frame(height: 100)
                    .overlay(
                        Text(notes.isEmpty ? "Enter match notes..." : "")
                            .foregroundColor(.gray)
                            .padding(.top, 8)
                            .padding(.leading, 5)
                        , alignment: .topLeading
                    )
            }
            .listRowBackground(Color.white.opacity(0.05))
            
            Button(action: submitData) {
                if isSubmitting {
                    ProgressView()
                } else {
                    Text("Submit Scouting Data")
                        .frame(maxWidth: .infinity)
                        .fontWeight(.black)
                        .foregroundColor(.white)
                }
            }
            .disabled(isSubmitting)
            .listRowBackground(Color.orange)
        }
        .navigationTitle("New Scout")
        .scrollContentBackground(.hidden)
        .background(Color(hex: "0D1445"))
        .alert(isPresented: $showAlert) {
            Alert(title: Text("Scout Hub"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
        }
    }
    
    func submitData() {
        guard !teamNumber.isEmpty, !matchNumber.isEmpty else {
            alertMessage = "Please fill in team and match numbers."
            showAlert = true
            return
        }
        
        isSubmitting = true
        
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                let scoutId = session.user.id.uuidString
                
                let scoutData = ScoutingData(
                    scout_id: scoutId,
                    team_number: Int(teamNumber) ?? 0,
                    match_id: matchNumber,
                    alliance_color: allianceColor.lowercased(),
                    autonomous_points: autoPoints,
                    teleop_points: teleopPoints,
                    endgame_points: endgamePoints,
                    final_score: autoPoints + teleopPoints + endgamePoints,
                    notes: notes.isEmpty ? "{}" : notes
                )
                
                try await SupabaseManager.shared.client
                    .from("scouting_data")
                    .insert(scoutData)
                    .execute()
                
                await MainActor.run {
                    alertMessage = "Data submitted successfully!"
                    showAlert = true
                    isSubmitting = false
                    // Reset fields
                    teamNumber = ""
                    matchNumber = ""
                    autoPoints = 0
                    teleopPoints = 0
                    endgamePoints = 0
                    notes = ""
                }
            } catch {
                await MainActor.run {
                    alertMessage = "Submission failed: \(error.localizedDescription)"
                    showAlert = true
                    isSubmitting = false
                }
            }
        }
    }
}

