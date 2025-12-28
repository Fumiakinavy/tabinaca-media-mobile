import SwiftUI

struct ChatMapPlaceholderView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 4)
            VStack(spacing: 8) {
                Image(systemName: "map")
                    .font(.system(size: 36))
                    .foregroundStyle(AppColors.primary)
                Text("Map view")
                    .font(AppTypography.headline)
                    .foregroundStyle(AppColors.textPrimary)
                Text("Map integration will appear here.")
                    .font(AppTypography.body)
                    .foregroundStyle(AppColors.textSecondary)
            }
        }
    }
}

#Preview {
    ChatMapPlaceholderView()
        .padding()
        .frame(height: 220)
}
