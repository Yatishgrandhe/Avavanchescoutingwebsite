import SwiftUI
import Supabase
import PhotosUI

struct PitScoutingView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var teams: [Team] = []
    @State private var selectedTeamNumber: Int?
    @State private var robotName = ""
    @State private var driveType = ""
    @State private var notes = ""
    @State private var robotImageUrl: String?
    @State private var selectedImageData: Data?
    @State private var isUploadingImage = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var showImagePicker = false
    @State private var showCamera = false
    @State private var isLoadingTeams = true
    
    private let uploadURL = URL(string: "https://avalanchescouting.vercel.app/api/upload-robot-image")!
    
    var body: some View {
        ZStack {
            Color(hex: "0D1445").ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(8)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                    }
                    if let ok = successMessage {
                        Text(ok)
                            .font(.caption)
                            .foregroundColor(.green)
                            .padding(8)
                    }
                    
                    Text("Team")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                    if isLoadingTeams {
                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Picker("Team", selection: $selectedTeamNumber) {
                            Text("Select team").tag(nil as Int?)
                            ForEach(teams, id: \.team_number) { team in
                                Text("\(team.team_name) (#\(team.team_number))").tag(team.team_number as Int?)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                        .accentColor(.white)
                    }
                    
                    TextField("Robot name", text: $robotName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .foregroundColor(.black)
                    TextField("Drive type", text: $driveType)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .foregroundColor(.black)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .lineLimit(3...6)
                        .foregroundColor(.black)
                    
                    Text("Robot image")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                    HStack(spacing: 12) {
                        if selectedImageData != nil || robotImageUrl != nil {
                            if let data = selectedImageData, let ui = UIImage(data: data) {
                                Image(uiImage: ui)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 80, height: 80)
                                    .cornerRadius(8)
                            } else if let url = robotImageUrl, let u = URL(string: url) {
                                AsyncImage(url: u) { phase in
                                    if let img = phase.image { img.resizable().scaledToFit() }
                                    else { ProgressView() }
                                }
                                .frame(width: 80, height: 80)
                                .cornerRadius(8)
                            }
                            Button("Remove") {
                                selectedImageData = nil
                                robotImageUrl = nil
                            }
                            .foregroundColor(.orange)
                        }
                        if isUploadingImage {
                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Button("Gallery") { showImagePicker = true }
                                .buttonStyle(.borderedProminent)
                                .tint(Color(hex: "1A2B7C"))
                            Button("Camera") { showCamera = true }
                                .buttonStyle(.borderedProminent)
                                .tint(Color(hex: "1A2B7C"))
                        }
                    }
                    .padding(8)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(12)
                    
                    Button(action: submitForm) {
                        HStack {
                            if isSubmitting {
                                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Save pit scouting")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(selectedTeamNumber != nil ? Color.orange : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(selectedTeamNumber == nil || isSubmitting)
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("Pit Scouting")
        .onAppear { fetchTeams() }
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(imageData: $selectedImageData, onPick: {
                showImagePicker = false
                if selectedImageData != nil { uploadImage() }
            })
        }
        .sheet(isPresented: $showCamera) {
            CameraPicker(imageData: $selectedImageData, onPick: {
                showCamera = false
                if selectedImageData != nil { uploadImage() }
            })
        }
    }
    
    func fetchTeams() {
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
                    if selectedTeamNumber == nil, let first = fetched.first {
                        selectedTeamNumber = first.team_number
                    }
                    isLoadingTeams = false
                }
            } catch {
                await MainActor.run { isLoadingTeams = false }
            }
        }
    }
    
    func uploadImage() {
        guard let data = selectedImageData,
              let teamNum = selectedTeamNumber,
              let team = teams.first(where: { $0.team_number == teamNum }) else { return }
        isUploadingImage = true
        errorMessage = nil
        Task {
            do {
                let url = try await performUpload(imageData: data, teamNumber: teamNum, teamName: team.team_name)
                await MainActor.run {
                    robotImageUrl = url
                    isUploadingImage = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isUploadingImage = false
                }
            }
        }
    }
    
    func performUpload(imageData: Data, teamNumber: Int, teamName: String) async throws -> String {
        let boundary = UUID().uuidString
        var request = URLRequest(url: uploadURL)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"teamNumber\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(teamNumber)\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"teamName\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(teamName)\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"robot.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw NSError(domain: "Upload", code: -1, userInfo: [NSLocalizedDescriptionKey: "Upload failed"])
        }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let url = json["directViewUrl"] as? String {
            return url
        }
        throw NSError(domain: "Upload", code: -1, userInfo: [NSLocalizedDescriptionKey: "No URL in response"])
    }
    
    func submitForm() {
        guard let teamNum = selectedTeamNumber else { return }
        errorMessage = nil
        successMessage = nil
        isSubmitting = true
        
        Task {
            do {
                let session = try await SupabaseManager.shared.client.auth.session
                let userId = session.user.id.uuidString
                let email = session.user.email ?? ""
                let name = session.user.userMetadata["full_name"] as? String ?? session.user.email ?? ""
                
                let payload = PitScoutingInsert(
                    team_number: teamNum,
                    robot_name: robotName.isEmpty ? nil : robotName,
                    drive_type: driveType.isEmpty ? nil : driveType,
                    notes: notes.isEmpty ? nil : notes,
                    robot_image_url: robotImageUrl,
                    photos: robotImageUrl != nil ? [robotImageUrl!] : [],
                    autonomous_capabilities: [],
                    teleop_capabilities: [],
                    endgame_capabilities: [],
                    drive_train_details: [:],
                    robot_dimensions: [:],
                    strengths: [],
                    weaknesses: [],
                    submitted_by: userId,
                    submitted_by_email: email,
                    submitted_by_name: name
                )
                
                try await SupabaseManager.shared.client
                    .from("pit_scouting_data")
                    .insert(payload)
                    .execute()
                
                await MainActor.run {
                    successMessage = "Saved successfully."
                    isSubmitting = false
                    robotName = ""
                    driveType = ""
                    notes = ""
                    robotImageUrl = nil
                    selectedImageData = nil
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isSubmitting = false
                }
            }
        }
    }
}

// MARK: - Image picker (Photos)
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var imageData: Data?
    var onPick: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = 1
        let vc = PHPickerViewController(configuration: config)
        vc.delegate = context.coordinator
        return vc
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: ImagePicker
        init(_ parent: ImagePicker) { self.parent = parent }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()
            guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self) else {
                parent.onPick()
                return
            }
            provider.loadObject(ofClass: UIImage.self) { [weak self] obj, _ in
                guard let img = obj as? UIImage, let data = img.jpegData(compressionQuality: 0.8) else {
                    DispatchQueue.main.async { self?.parent.onPick() }
                    return
                }
                DispatchQueue.main.async {
                    self?.parent.imageData = data
                    self?.parent.onPick()
                }
            }
        }
    }
}

// MARK: - Camera picker
struct CameraPicker: UIViewControllerRepresentable {
    @Binding var imageData: Data?
    var onPick: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let vc = UIImagePickerController()
        vc.sourceType = .camera
        vc.delegate = context.coordinator
        return vc
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            parent.dismiss()
            guard let img = info[.originalImage] as? UIImage, let data = img.jpegData(compressionQuality: 0.8) else {
                parent.onPick()
                return
            }
            parent.imageData = data
            parent.onPick()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
            parent.onPick()
        }
    }
}

// MARK: - Pit scouting insert payload
private struct PitScoutingInsert: Encodable {
    let team_number: Int
    let robot_name: String?
    let drive_type: String?
    let notes: String?
    let robot_image_url: String?
    let photos: [String]
    let autonomous_capabilities: [String]
    let teleop_capabilities: [String]
    let endgame_capabilities: [String]
    let drive_train_details: [String: String]
    let robot_dimensions: [String: String]
    let strengths: [String]
    let weaknesses: [String]
    let submitted_by: String
    let submitted_by_email: String
    let submitted_by_name: String
    
    enum CodingKeys: String, CodingKey {
        case team_number, robot_name, drive_type, notes, robot_image_url, photos
        case autonomous_capabilities, teleop_capabilities, endgame_capabilities
        case drive_train_details, robot_dimensions, strengths, weaknesses
        case submitted_by, submitted_by_email, submitted_by_name
    }
}
