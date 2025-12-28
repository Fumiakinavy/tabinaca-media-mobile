import SwiftUI

struct LikesView: View {
    @EnvironmentObject private var authStore: AuthStore

    var body: some View {
        Group {
            if authStore.isAuthenticated {
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 42))
                        .foregroundStyle(AppColors.primary)
                    Text("Saved experiences will appear here.")
                        .font(AppTypography.body)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(AppColors.background)
            } else {
                AuthenticationRequiredView(
                    title: "Sign in required",
                    message: "Please sign in to view your saved experiences.",
                    actionTitle: "Sign in"
                ) {
                    Task { await authStore.signIn() }
                }
            }
        }
        .navigationTitle(AppStrings.likesTitle)
    }
}

#Preview {
    NavigationStack {
        LikesView()
    }
    .environmentObject(AuthStore())
}
