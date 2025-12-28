import Foundation

struct Article: Identifiable, Decodable {
    let id: String
    let title: String
    let summary: String
    let coverImage: String?
    let date: String
    let tags: [String]?

    enum CodingKeys: String, CodingKey {
        case id = "slug"
        case title
        case summary
        case coverImage
        case date
        case tags
    }
}
