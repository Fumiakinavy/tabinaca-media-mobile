#if canImport(Supabase)
import AuthenticationServices
import Foundation
import Supabase
import UIKit

final class SupabaseAuthService: NSObject, AuthService {
    private let client: SupabaseClient
    private var authSession: ASWebAuthenticationSession?

    override init() {
        guard let url = URL(string: AppConfig.supabaseURLString) else {
            fatalError("Invalid Supabase URL")
        }
        client = SupabaseClient(supabaseURL: url, supabaseKey: AppConfig.supabaseAnonKey)
        super.init()
    }

    func signInWithGoogle() async throws {
        let redirectURL = URL(string: AppConfig.supabaseRedirectURLString)
        let authURL = try await client.auth.getOAuthSignInURL(provider: .google, redirectTo: redirectURL)
        try await startWebAuthentication(url: authURL)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    func currentUser() async -> AuthUser? {
        let user = client.auth.currentUser
        guard let user else { return nil }
        return AuthUser(id: user.id.uuidString, email: user.email)
    }

    private func startWebAuthentication(url: URL) async throws {
        try await withCheckedThrowingContinuation { continuation in
            authSession = ASWebAuthenticationSession(url: url,
                                                     callbackURLScheme: AppConfig.supabaseCallbackScheme) { [weak self] callbackURL, error in
                if let error {
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: AuthError.cancelled)
                    } else {
                        continuation.resume(throwing: error)
                    }
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                Task {
                    do {
                        _ = try await self?.client.auth.session(from: callbackURL)
                        continuation.resume(returning: ())
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
            }
            authSession?.presentationContextProvider = self
            authSession?.prefersEphemeralWebBrowserSession = true
            authSession?.start()
        }
    }
}

extension SupabaseAuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}
#endif
