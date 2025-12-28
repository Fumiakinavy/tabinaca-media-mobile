import SwiftUI

struct CouponCard: View {
    let code: String
    let discount: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Coupon")
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(code)
                        .font(AppTypography.title)
                        .foregroundStyle(AppColors.primary)
                    Text(discount)
                        .font(AppTypography.body)
                        .foregroundStyle(AppColors.textSecondary)
                }
                Spacer()
                Image(systemName: "ticket")
                    .font(.system(size: 28))
                    .foregroundStyle(AppColors.primary)
            }
        }
        .padding(AppSpacing.md)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    CouponCard(code: "GAPPY2025", discount: "10% off")
        .padding()
}
