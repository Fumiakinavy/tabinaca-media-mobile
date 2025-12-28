import Foundation

struct Place: Identifiable, Decodable {
    let id: String
    let name: String
    let address: String?
    let rating: Double?
    let reviewCount: Int?
    let distanceMeters: Double?

    enum CodingKeys: String, CodingKey {
        case id = "place_id"
        case name
        case address = "formatted_address"
        case rating
        case reviewCount = "user_ratings_total"
        case distanceMeters = "distance_m"
    }
}
