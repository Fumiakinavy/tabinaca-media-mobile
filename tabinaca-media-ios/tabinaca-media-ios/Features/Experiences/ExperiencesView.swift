import SwiftUI

struct ExperiencesView: View {
    @State private var query = ""

    private let demoExperiences: [Experience] = [
        Experience(id: "kimono", title: "Kimono Dressing Experience", summary: "Dress in traditional kimono near Shibuya.", coverImage: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80", price: 4800, duration: "60 min", level: "Beginner", tags: ["culture", "photo"]),
        Experience(id: "sushi", title: "Sushi Making Workshop", summary: "Hands-on sushi class with local chefs.", coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80", price: 6500, duration: "90 min", level: "Beginner", tags: ["food"]),
        Experience(id: "tea", title: "Tea Ceremony Experience", summary: "Learn the art of Japanese tea ceremony.", coverImage: "https://images.unsplash.com/photo-1506086679525-9b8f2f5c2d54?auto=format&fit=crop&w=1200&q=80", price: 5200, duration: "45 min", level: "All levels", tags: ["culture"])
    ]

    var filteredExperiences: [Experience] {
        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return demoExperiences
        }
        return demoExperiences.filter { $0.title.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Find experiences in Shibuya")
                        .font(AppTypography.title)
                        .foregroundStyle(AppColors.textPrimary)
                    Text("Search by category, duration, or keywords.")
                        .font(AppTypography.body)
                        .foregroundStyle(AppColors.textSecondary)
                }

                TextField("Search experiences", text: $query)
                    .textFieldStyle(.roundedBorder)

                LazyVStack(spacing: AppSpacing.lg) {
                    ForEach(filteredExperiences) { experience in
                        NavigationLink {
                            ExperienceDetailView(experience: experience)
                        } label: {
                            ExperienceCard(experience: experience)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
        .background(AppColors.background)
        .navigationTitle(AppStrings.experiencesTitle)
    }
}

#Preview {
    NavigationStack {
        ExperiencesView()
    }
}
