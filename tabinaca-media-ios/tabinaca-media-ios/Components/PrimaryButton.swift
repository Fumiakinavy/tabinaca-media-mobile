import SwiftUI

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.md)
                .background(AppColors.primary)
                .cornerRadius(14)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PrimaryButton(title: "Take the Quiz") {}
        .padding()
}
