import Foundation

final class MockAuthService: AuthService {
    private var user: AuthUser?

    func signInWithGoogle() async throws {
        user = AuthUser(id: UUID().uuidString, email: "guest@example.com")
    }

    func signOut() async throws {
        user = nil
    }

    func currentUser() async -> AuthUser? {
        user
    }
}
