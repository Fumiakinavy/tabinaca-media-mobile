import SwiftUI

struct QuizView: View {
    @State private var step = 1

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Text("Travel Type Quiz")
                .font(AppTypography.title)
                .foregroundStyle(AppColors.textPrimary)

            Text("Step \(step) of 3")
                .font(AppTypography.caption)
                .foregroundStyle(AppColors.textSecondary)

            PrimaryButton(title: "Next") {
                step = min(step + 1, 3)
            }

            PrimaryButton(title: "Show Result") {}
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
        .navigationTitle(AppStrings.quizTitle)
    }
}

#Preview {
    NavigationStack {
        QuizView()
    }
}
