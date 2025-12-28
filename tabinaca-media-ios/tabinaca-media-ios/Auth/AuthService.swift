import Foundation

struct AuthUser {
    let id: String
    let email: String?
}

protocol AuthService {
    func signInWithGoogle() async throws
    func signOut() async throws
    func currentUser() async -> AuthUser?
}
