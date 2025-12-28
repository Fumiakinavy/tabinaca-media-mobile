import SwiftUI

struct RemoteImageView: View {
    let urlString: String?
    let height: CGFloat

    var body: some View {
        if let urlString, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: height)
                        .background(AppColors.background)
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity, minHeight: height)
                        .clipped()
                case .failure:
                    Color.gray.opacity(0.2)
                        .frame(maxWidth: .infinity, minHeight: height)
                @unknown default:
                    Color.gray.opacity(0.2)
                        .frame(maxWidth: .infinity, minHeight: height)
                }
            }
        } else {
            Color.gray.opacity(0.2)
                .frame(maxWidth: .infinity, minHeight: height)
        }
    }
}

#Preview {
    RemoteImageView(urlString: nil, height: 180)
        .padding()
}
