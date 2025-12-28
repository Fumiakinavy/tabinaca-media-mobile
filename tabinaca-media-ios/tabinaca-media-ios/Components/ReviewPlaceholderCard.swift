import SwiftUI

struct ReviewPlaceholderCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Reviews")
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            HStack(spacing: 6) {
                Image(systemName: "star.fill")
                    .foregroundStyle(.yellow)
                Text("4.7")
                    .font(AppTypography.body)
                    .foregroundStyle(AppColors.textPrimary)
                Text("(120 reviews)")
                    .font(AppTypography.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
            Text("Google reviews will appear here.")
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
        }
        .padding(AppSpacing.md)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    ReviewPlaceholderCard()
        .padding()
}
