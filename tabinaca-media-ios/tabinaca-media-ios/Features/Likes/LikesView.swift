import SwiftUI

struct LikesView: View {
    @EnvironmentObject private var authStore: AuthStore

    private let demoSaved: [Experience] = [
        Experience(id: "kimono", title: "Kimono Dressing Experience", summary: "Dress in traditional kimono near Shibuya.", coverImage: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80", price: 4800, duration: "60 min", level: "Beginner", tags: nil)
    ]

    var body: some View {
        Group {
            if authStore.isAuthenticated {
                if demoSaved.isEmpty {
                    EmptyStateView(title: "No saved experiences", message: "Tap the heart icon to save experiences.", systemImage: "heart")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(AppColors.background)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: AppSpacing.lg) {
                            Text("Saved experiences")
                                .font(AppTypography.title)
                                .foregroundStyle(AppColors.textPrimary)

                            LazyVStack(spacing: AppSpacing.lg) {
                                ForEach(demoSaved) { experience in
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
                }
            } else {
                AuthenticationRequiredView(
                    title: "Sign in required",
                    message: "Please sign in to view your saved experiences.",
                    actionTitle: "Sign in"
                ) {
                    Task { await authStore.signIn() }
                }
            }
        }
        .navigationTitle(AppStrings.likesTitle)
    }
}

#Preview {
    NavigationStack {
        LikesView()
    }
    .environmentObject(AuthStore())
}
