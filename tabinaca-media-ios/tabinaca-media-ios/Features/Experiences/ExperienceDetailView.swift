import SwiftUI

struct ExperienceDetailView: View {
    let experience: Experience

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                RemoteImageView(urlString: experience.coverImage, height: 240)
                    .cornerRadius(18)

                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text(experience.title)
                        .font(AppTypography.title)
                        .foregroundStyle(AppColors.textPrimary)

                    Text(experience.summary)
                        .font(AppTypography.body)
                        .foregroundStyle(AppColors.textSecondary)
                }

                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    InfoRow(title: "Price", value: experience.price.map { "¥\($0)" } ?? "TBD")
                    InfoRow(title: "Duration", value: experience.duration ?? "TBD")
                    InfoRow(title: "Level", value: experience.level ?? "TBD")
                }
                .padding(AppSpacing.md)
                .background(Color.white)
                .cornerRadius(18)
                .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)

                CouponCard(code: "GAPPY2025", discount: "10% off")

                ReviewPlaceholderCard()

                LocationPlaceholderCard()

                PrimaryButton(title: "Save to Likes") {}
            }
            .padding(AppSpacing.lg)
        }
        .background(AppColors.background)
        .navigationTitle(experience.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        ExperienceDetailView(
            experience: Experience(
                id: "kimono",
                title: "Kimono Dressing Experience",
                summary: "Dress in traditional kimono near Shibuya.",
                coverImage: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80",
                price: 4800,
                duration: "60 min",
                level: "Beginner",
                tags: nil
            )
        )
    }
}
