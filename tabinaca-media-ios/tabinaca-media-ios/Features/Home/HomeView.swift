import SwiftUI

struct HomeView: View {
    @State private var query = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Discover Shibuya")
                        .font(AppTypography.title)
                        .foregroundStyle(AppColors.textPrimary)
                    Text("Authentic experiences, articles, and AI travel help")
                        .font(AppTypography.body)
                        .foregroundStyle(AppColors.textSecondary)
                }

                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    TextField("Search for ramen, temples, cafes...", text: $query)
                        .textFieldStyle(.roundedBorder)
                    PrimaryButton(title: "Search with Gappy Chat") {}
                }

                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    SectionHeader(title: "Start Here", subtitle: "Quick actions")
                    NavigationLink("Take the Travel Type Quiz") {
                        QuizView()
                    }
                    .foregroundStyle(AppColors.primary)

                    NavigationLink("Browse Latest Articles") {
                        ArticlesView()
                    }
                    .foregroundStyle(AppColors.primary)
                }
            }
            .padding(AppSpacing.lg)
        }
        .background(AppColors.background)
        .navigationTitle(AppStrings.homeTitle)
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
