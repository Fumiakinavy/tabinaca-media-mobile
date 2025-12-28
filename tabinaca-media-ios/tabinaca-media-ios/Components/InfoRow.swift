import SwiftUI

struct InfoRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: AppSpacing.sm) {
            Text(title)
                .font(AppTypography.caption)
                .foregroundStyle(AppColors.textSecondary)
                .frame(width: 90, alignment: .leading)
            Text(value)
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textPrimary)
        }
    }
}

#Preview {
    InfoRow(title: "Duration", value: "60 min")
        .padding()
}
