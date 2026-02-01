import SwiftUI

@main
struct AvalancheApp: App {
    @State private var oauthCallbackURL: URL?

    var body: some Scene {
        WindowGroup {
            HTMLAppView(oauthCallbackURL: $oauthCallbackURL)
                .onOpenURL { url in
                    if url.scheme == "avalanche-scouting" {
                        oauthCallbackURL = url
                    }
                }
        }
    }
}
