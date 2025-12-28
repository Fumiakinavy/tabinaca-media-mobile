import Foundation

enum AuthServiceFactory {
    static func make() -> AuthService {
        #if canImport(Supabase)
        return SupabaseAuthService()
        #else
        return MockAuthService()
        #endif
    }
}
