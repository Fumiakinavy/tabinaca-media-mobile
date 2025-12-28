import Foundation

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case server(Int)
    case decoding(Error)
    case unknown(Error)
}
