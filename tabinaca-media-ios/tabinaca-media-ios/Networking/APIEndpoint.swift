import Foundation

enum APIEndpoint {
    case experiences
    case experienceDetail(String)
    case articles
    case articleDetail(String)
    case chatSendMessage

    var path: String {
        switch self {
        case .experiences:
            return "/api/experiences"
        case .experienceDetail(let slug):
            return "/api/experiences/\(slug)"
        case .articles:
            return "/api/articles"
        case .articleDetail(let slug):
            return "/api/articles/\(slug)"
        case .chatSendMessage:
            return "/api/chat/send-message"
        }
    }
}
