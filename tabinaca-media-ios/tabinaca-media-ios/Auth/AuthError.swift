import Foundation

enum AuthError: Error {
    case missingDependency
    case cancelled
    case invalidCallback
    case unknown
}
