import SwiftUI

struct AuthenticationRequiredView: View {
    let title: String
    let message: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "lock.fill")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.primary)
            Text(title)
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            Text(message)
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton(title: actionTitle, action: action)
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
    }
}

#Preview {
    AuthenticationRequiredView(title: "Sign in required", message: "Please sign in to continue.", actionTitle: "Sign in") {}
}
