import Foundation

struct ChatMessage: Identifiable, Decodable {
    let id: String
    let role: String
    let content: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case role
        case content
        case createdAt = "created_at"
    }
}
