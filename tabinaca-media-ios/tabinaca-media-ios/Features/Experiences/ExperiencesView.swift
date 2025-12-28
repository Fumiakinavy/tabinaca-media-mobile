import SwiftUI

struct ExperiencesView: View {
    private let demoExperiences: [Experience] = [
        Experience(id: "kimono", title: "Kimono Dressing Experience", summary: "Dress in traditional kimono near Shibuya.", coverImage: nil, price: 4800, duration: "60 min", level: "Beginner", tags: ["culture", "photo"]),
        Experience(id: "sushi", title: "Sushi Making Workshop", summary: "Hands-on sushi class with local chefs.", coverImage: nil, price: 6500, duration: "90 min", level: "Beginner", tags: ["food"])
    ]

    var body: some View {
        List(demoExperiences) { experience in
            VStack(alignment: .leading, spacing: 6) {
                Text(experience.title)
                    .font(AppTypography.headline)
                    .foregroundStyle(AppColors.textPrimary)
                Text(experience.summary)
                    .font(AppTypography.body)
                    .foregroundStyle(AppColors.textSecondary)
                HStack(spacing: 8) {
                    if let price = experience.price {
                        Text("¥\(price)")
                    }
                    if let duration = experience.duration {
                        Text(duration)
                    }
                }
                .font(AppTypography.caption)
                .foregroundStyle(AppColors.textSecondary)
            }
            .padding(.vertical, 6)
        }
        .listStyle(.plain)
        .navigationTitle(AppStrings.experiencesTitle)
    }
}

#Preview {
    NavigationStack {
        ExperiencesView()
    }
}
