import SwiftUI

struct EmptyStateView: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: systemImage)
                .font(.system(size: 42))
                .foregroundStyle(AppColors.primary)
            Text(title)
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            Text(message)
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.lg)
    }
}

#Preview {
    EmptyStateView(title: "No Results", message: "Try a different keyword.", systemImage: "magnifyingglass")
}
