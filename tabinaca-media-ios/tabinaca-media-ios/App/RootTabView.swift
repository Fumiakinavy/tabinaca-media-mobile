import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label(AppStrings.tabHome, systemImage: "house")
            }

            NavigationStack {
                ChatView()
            }
            .tabItem {
                Label(AppStrings.tabChat, systemImage: "message")
            }

            NavigationStack {
                ExperiencesView()
            }
            .tabItem {
                Label(AppStrings.tabExperiences, systemImage: "map")
            }

            NavigationStack {
                LikesView()
            }
            .tabItem {
                Label(AppStrings.tabLikes, systemImage: "heart")
            }
        }
        .tint(AppColors.primary)
    }
}

#Preview {
    RootTabView()
        .environmentObject(AuthStore())
}
