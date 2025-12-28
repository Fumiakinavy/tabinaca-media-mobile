import SwiftUI

struct LocationPlaceholderCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Location")
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            Text("Map preview will appear here.")
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.gray.opacity(0.15))
                .frame(height: 160)
                .overlay(
                    Image(systemName: "map")
                        .font(.system(size: 32))
                        .foregroundStyle(AppColors.primary)
                )
            PrimaryButton(title: "Open in Google Maps") {}
        }
        .padding(AppSpacing.md)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    LocationPlaceholderCard()
        .padding()
}
