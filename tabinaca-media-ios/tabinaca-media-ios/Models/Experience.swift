import Foundation

struct Experience: Identifiable, Decodable {
    let id: String
    let title: String
    let summary: String
    let coverImage: String?
    let price: Int?
    let duration: String?
    let level: String?
    let tags: [String]?

    enum CodingKeys: String, CodingKey {
        case id = "slug"
        case title
        case summary
        case coverImage
        case price
        case duration
        case level
        case tags
    }
}
