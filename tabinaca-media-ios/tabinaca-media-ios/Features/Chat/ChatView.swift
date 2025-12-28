import SwiftUI

struct ChatView: View {
    @EnvironmentObject private var authStore: AuthStore
    private let demoMessages: [ChatMessage] = [
        ChatMessage(id: "1", role: "assistant", content: "Hi! Where would you like to explore in Shibuya?", createdAt: Date()),
        ChatMessage(id: "2", role: "user", content: "Find me a cozy cafe near Hachiko.", createdAt: Date())
    ]

    @State private var draft = ""

    var body: some View {
        Group {
            if authStore.isAuthenticated {
                VStack(spacing: 0) {
                    List(demoMessages) { message in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(message.role.capitalized)
                                .font(AppTypography.caption)
                                .foregroundStyle(AppColors.textSecondary)
                            Text(message.content)
                                .font(AppTypography.body)
                                .foregroundStyle(AppColors.textPrimary)
                        }
                        .padding(.vertical, 6)
                    }
                    .listStyle(.plain)

                    Divider()

                    HStack(spacing: AppSpacing.sm) {
                        TextField("Ask Gappy...", text: $draft)
                            .textFieldStyle(.roundedBorder)
                        Button("Send") {
                            draft = ""
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(AppColors.primary)
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.background)
                }
            } else {
                AuthenticationRequiredView(
                    title: "Sign in required",
                    message: "Please sign in to access Gappy Chat.",
                    actionTitle: "Sign in"
                ) {
                    Task { await authStore.signIn() }
                }
            }
        }
        .navigationTitle(AppStrings.chatTitle)
    }
}

#Preview {
    NavigationStack {
        ChatView()
    }
    .environmentObject(AuthStore())
}
