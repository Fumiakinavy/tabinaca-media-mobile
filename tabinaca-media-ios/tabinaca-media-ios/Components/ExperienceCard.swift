import SwiftUI

struct ExperienceCard: View {
    let experience: Experience

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            RemoteImageView(urlString: experience.coverImage, height: 160)
                .cornerRadius(14)

            Text(experience.title)
                .font(AppTypography.headline)
                .foregroundStyle(AppColors.textPrimary)

            Text(experience.summary)
                .font(AppTypography.body)
                .foregroundStyle(AppColors.textSecondary)
                .lineLimit(2)

            HStack(spacing: 8) {
                if let price = experience.price {
                    Text("¥\(price)")
                }
                if let duration = experience.duration {
                    Text(duration)
                }
                if let level = experience.level {
                    Text(level)
                }
            }
            .font(AppTypography.caption)
            .foregroundStyle(AppColors.textSecondary)
        }
        .padding(AppSpacing.md)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    ExperienceCard(experience: Experience(id: "kimono", title: "Kimono Dressing Experience", summary: "Dress in traditional kimono near Shibuya.", coverImage: nil, price: 4800, duration: "60 min", level: "Beginner", tags: nil))
        .padding()
}
