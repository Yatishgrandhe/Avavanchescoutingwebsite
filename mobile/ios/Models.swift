import Foundation
import SwiftUI
import UIKit

extension Image {
    /// Avalanche logo from bundle (image.png in Copy Bundle Resources).
    static var avalancheLogo: Image {
        if let uiImage = UIImage(named: "image.png", in: .main, with: nil) {
            return Image(uiImage: uiImage)
        }
        return Image(systemName: "photo")
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct Team: Codable, Identifiable {
    var id: Int { team_number }
    let team_number: Int
    let team_name: String
    let team_color: String?
    let created_at: String?
    
    init(team_number: Int, team_name: String, team_color: String? = nil, created_at: String? = nil) {
        self.team_number = team_number
        self.team_name = team_name
        self.team_color = team_color
        self.created_at = created_at
    }
    
    enum CodingKeys: String, CodingKey {
        case team_number, team_name, team_color, created_at
    }
}

struct ScoutingData: Codable {
    let id: String?
    let scout_id: String?
    let team_number: Int
    let match_id: String
    let alliance_color: String
    let autonomous_points: Int?
    let teleop_points: Int?
    let endgame_points: Int?
    let final_score: Int?
    let notes: String?
    let defense_rating: Int?
    let comments: String?
    let created_at: String?
    
    init(id: String? = nil, scout_id: String? = nil, team_number: Int, match_id: String, alliance_color: String,
         autonomous_points: Int? = nil, teleop_points: Int? = nil, endgame_points: Int? = nil,
         final_score: Int? = nil, notes: String? = nil, defense_rating: Int? = nil, comments: String? = nil, created_at: String? = nil) {
        self.id = id
        self.scout_id = scout_id
        self.team_number = team_number
        self.match_id = match_id
        self.alliance_color = alliance_color
        self.autonomous_points = autonomous_points
        self.teleop_points = teleop_points
        self.endgame_points = endgame_points
        self.final_score = final_score
        self.notes = notes
        self.defense_rating = defense_rating
        self.comments = comments
        self.created_at = created_at
    }
    
    enum CodingKeys: String, CodingKey {
        case id, scout_id, team_number, match_id, alliance_color, autonomous_points, teleop_points, endgame_points, final_score, notes, defense_rating, comments, created_at
    }
    
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id)
        scout_id = try c.decodeIfPresent(String.self, forKey: .scout_id)
        team_number = try c.decode(Int.self, forKey: .team_number)
        match_id = try c.decode(String.self, forKey: .match_id)
        alliance_color = try c.decode(String.self, forKey: .alliance_color)
        autonomous_points = try c.decodeIfPresent(Int.self, forKey: .autonomous_points)
        teleop_points = try c.decodeIfPresent(Int.self, forKey: .teleop_points)
        endgame_points = try c.decodeIfPresent(Int.self, forKey: .endgame_points)
        final_score = try c.decodeIfPresent(Int.self, forKey: .final_score)
        defense_rating = try c.decodeIfPresent(Int.self, forKey: .defense_rating)
        comments = try c.decodeIfPresent(String.self, forKey: .comments)
        created_at = try c.decodeIfPresent(String.self, forKey: .created_at)
        if let s = try? c.decode(String.self, forKey: .notes) {
            notes = s
        } else {
            notes = nil
        }
    }
}

struct TeamStat: Codable {
    let team_number: Int
    let team_name: String
}

struct PitScoutingRecord: Codable, Identifiable {
    let id: String?
    let team_number: Int
    let robot_name: String?
    let robot_image_url: String?
    let drive_type: String?
    let notes: String?
    let created_at: String?
    
    enum CodingKeys: String, CodingKey {
        case id, team_number, robot_name, robot_image_url, drive_type, notes, created_at
    }
}
