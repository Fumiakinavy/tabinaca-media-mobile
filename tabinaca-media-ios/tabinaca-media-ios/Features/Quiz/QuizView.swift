import SwiftUI

struct QuizStep: Identifiable {
    let id: Int
    let title: String
    let subtitle: String
    let options: [String]
}

struct QuizView: View {
    @State private var currentStepIndex = 0
    @State private var selections: [Int: String] = [:]
    @State private var showResult = false

    private let steps: [QuizStep] = [
        QuizStep(id: 0, title: "Who are you traveling with?", subtitle: "Select one", options: ["Solo", "Partner", "Friends", "Family"]),
        QuizStep(id: 1, title: "How much walking is okay?", subtitle: "Select one", options: ["≤ 5 min", "≤ 10 min", "≥ 15 min"]),
        QuizStep(id: 2, title: "Preferred experience type", subtitle: "Select one", options: ["Food", "Culture", "Outdoors", "Relaxation"])
    ]

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            if showResult {
                resultView
            } else {
                stepHeader
                optionList
                stepControls
            }
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
        .navigationTitle(AppStrings.quizTitle)
    }

    private var stepHeader: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Step \(currentStepIndex + 1) of \(steps.count)")
                .font(AppTypography.caption)
                .foregroundStyle(AppColors.textSecondary)
            Text(steps[currentStepIndex].title)
                .font(AppTypography.title)
                .foregroundStyle(AppColors.textPrimary)
            Text(steps[currentStepIndex].subtitle)
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var optionList: some View {
        VStack(spacing: AppSpacing.sm) {
            ForEach(steps[currentStepIndex].options, id: \.self) { option in
                Button {
                    selections[steps[currentStepIndex].id] = option
                } label: {
                    HStack {
                        Text(option)
                            .font(AppTypography.body)
                            .foregroundStyle(AppColors.textPrimary)
                        Spacer()
                        if selections[steps[currentStepIndex].id] == option {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(AppColors.primary)
                        }
                    }
                    .padding(AppSpacing.md)
                    .background(Color.white)
                    .cornerRadius(14)
                    .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var stepControls: some View {
        HStack(spacing: AppSpacing.md) {
            Button("Back") {
                currentStepIndex = max(currentStepIndex - 1, 0)
            }
            .buttonStyle(.bordered)
            .disabled(currentStepIndex == 0)

            Spacer()

            Button(currentStepIndex == steps.count - 1 ? "Show Result" : "Next") {
                if currentStepIndex == steps.count - 1 {
                    showResult = true
                } else {
                    currentStepIndex += 1
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.primary)
            .disabled(selections[steps[currentStepIndex].id] == nil)
        }
    }

    private var resultView: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.primary)
            Text("Your travel type")
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)
            Text("Balanced Explorer")
                .font(AppTypography.title)
                .foregroundStyle(AppColors.textPrimary)
            Text("Based on your answers, we recommend a mix of food, culture, and relaxed activities in Shibuya.")
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)

            PrimaryButton(title: "Back to Home") {
                showResult = false
                currentStepIndex = 0
                selections.removeAll()
            }
        }
    }
}

#Preview {
    NavigationStack {
        QuizView()
    }
}
