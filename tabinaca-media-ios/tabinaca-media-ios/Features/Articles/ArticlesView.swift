import SwiftUI

struct ArticlesView: View {
    private let demoArticles: [Article] = [
        Article(id: "shibuya-guide", title: "Shibuya Beginner's Guide", summary: "Everything you need for your first visit.", coverImage: nil, date: "2025-12-01", tags: ["guide"]),
        Article(id: "half-day", title: "Perfect Shibuya Half-Day Tour", summary: "A compact itinerary with food and views.", coverImage: nil, date: "2025-11-15", tags: ["itinerary"])
    ]

    var body: some View {
        List(demoArticles) { article in
            VStack(alignment: .leading, spacing: 6) {
                Text(article.title)
                    .font(AppTypography.headline)
                    .foregroundStyle(AppColors.textPrimary)
                Text(article.summary)
                    .font(AppTypography.body)
                    .foregroundStyle(AppColors.textSecondary)
                Text(article.date)
                    .font(AppTypography.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }
            .padding(.vertical, 6)
        }
        .listStyle(.plain)
        .navigationTitle(AppStrings.articlesTitle)
    }
}

#Preview {
    NavigationStack {
        ArticlesView()
    }
}
