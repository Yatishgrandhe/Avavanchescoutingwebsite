import SwiftUI

/// Full-screen loading splash with logo, shown until the web app has loaded.
struct LoadingSplashView: View {
    /// Dark blue matching the web app theme (#0D1445).
    private static let backgroundColor = Color(red: 13/255, green: 20/255, blue: 69/255)

    var body: some View {
        ZStack {
            LoadingSplashView.backgroundColor
                .ignoresSafeArea()

            VStack(spacing: 24) {
                if let uiImage = UIImage(named: "image") {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 200, maxHeight: 200)
                }

                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)
            }
        }
        .ignoresSafeArea()
    }
}

#Preview {
    LoadingSplashView()
}
