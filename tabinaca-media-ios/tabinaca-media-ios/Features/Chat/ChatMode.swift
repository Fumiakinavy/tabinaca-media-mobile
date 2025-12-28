import Foundation

enum ChatMode: String, CaseIterable, Identifiable {
    case chat
    case map
    case split

    var id: String { rawValue }

    var title: String {
        switch self {
        case .chat: return "Chat"
        case .map: return "Map"
        case .split: return "Split"
        }
    }
}
