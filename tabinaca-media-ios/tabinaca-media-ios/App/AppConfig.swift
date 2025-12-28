import Foundation

enum AppConfig {
    static let displayName = "Gappy"
    static let baseURLString = "https://gappytravel.com"
    static let supportedLocales = ["en", "ja", "zh", "ko", "es", "fr"]
    static let supabaseURLString = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://placeholder.supabase.co"
    static let supabaseAnonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "placeholder"
    static let supabaseRedirectURLString = ProcessInfo.processInfo.environment["SUPABASE_REDIRECT_URL"] ?? "tabinaca-media-ios://auth-callback"
    static let supabaseCallbackScheme = ProcessInfo.processInfo.environment["SUPABASE_CALLBACK_SCHEME"] ?? "tabinaca-media-ios"
}
