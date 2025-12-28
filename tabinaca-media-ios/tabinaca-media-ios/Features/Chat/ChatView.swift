import SwiftUI

struct ChatView: View {
    @EnvironmentObject private var authStore: AuthStore
    @State private var draft = ""
    @State private var mode: ChatMode = .chat

    private let demoMessages: [ChatMessage] = [
        ChatMessage(id: "1", role: "assistant", content: "Hi! Where would you like to explore in Shibuya?", createdAt: Date()),
        ChatMessage(id: "2", role: "user", content: "Find me a cozy cafe near Hachiko.", createdAt: Date())
    ]

    var body: some View {
        Group {
            if authStore.isAuthenticated {
                VStack(spacing: 0) {
                    Picker("Mode", selection: $mode) {
                        ForEach(ChatMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding([.horizontal, .top], AppSpacing.md)

                    if mode == .chat {
                        chatList
                    } else if mode == .map {
                        ChatMapPlaceholderView()
                            .padding(AppSpacing.lg)
                    } else {
                        VStack(spacing: AppSpacing.md) {
                            chatList
                            ChatMapPlaceholderView()
                                .frame(height: 200)
                        }
                        .padding(AppSpacing.md)
                    }

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

    private var chatList: some View {
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
    }
}

#Preview {
    NavigationStack {
        ChatView()
    }
    .environmentObject(AuthStore())
}
