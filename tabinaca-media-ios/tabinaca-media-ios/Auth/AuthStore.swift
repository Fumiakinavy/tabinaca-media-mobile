import Combine
import Foundation
import SwiftUI

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var state: AuthState = .guest
    @Published private(set) var displayName: String? = nil
    @Published private(set) var errorMessage: String? = nil

    private let service: AuthService

    var isAuthenticated: Bool { state == .authenticated }

    init(service: AuthService? = nil) {
        self.service = service ?? AuthServiceFactory.make()
        Task { await refreshSession() }
    }

    func signIn() async {
        do {
            errorMessage = nil
            try await service.signInWithGoogle()
            let user = await service.currentUser()
            state = user == nil ? .guest : .authenticated
            displayName = user?.email
        } catch {
            errorMessage = "Sign in failed"
            state = .guest
        }
    }

    func signOut() async {
        do {
            errorMessage = nil
            try await service.signOut()
        } catch {
            errorMessage = "Sign out failed"
        }
        state = .guest
        displayName = nil
    }

    func refreshSession() async {
        let user = await service.currentUser()
        state = user == nil ? .guest : .authenticated
        displayName = user?.email
    }
}
