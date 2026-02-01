import SwiftUI
import Supabase
import AuthenticationServices

private let kRedirectURL = "avalanche-scouting://login-callback"

struct LoginView: View {
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            // Background Gradient
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "1A2B7C"), Color(hex: "0D1445")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 30) {
                Image.avalancheLogo
                    .resizable()
                    .scaledToFit()
                    .frame(width: 120, height: 120)
                    .shadow(radius: 10)
                
                VStack(spacing: 8) {
                    Text("Avalanche Scouting")
                        .font(.system(size: 32, weight: .black))
                        .foregroundColor(.white)
                    
                    Text("Secure Data Access")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
                
                Spacer()
                    .frame(height: 50)
                
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Button(action: signInWithDiscord) {
                        HStack {
                            Image(systemName: "bubble.left.fill")
                            Text("Sign in with Discord")
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "5865F2"))
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 5)
                    }
                    .padding(.horizontal, 40)
                }
                
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .padding()
        }
    }
    
    func signInWithDiscord() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                guard let redirectURL = URL(string: kRedirectURL) else {
                    await MainActor.run { errorMessage = "Invalid redirect URL"; isLoading = false }
                    return
                }
                let authURL = try await SupabaseManager.shared.client.auth.getOAuthSignInURL(
                    provider: .discord,
                    redirectTo: redirectURL
                )
                
                await MainActor.run {
                    // Use ASWebAuthenticationSession so redirect comes back to the app, not Safari/website
                    let session = ASWebAuthenticationSession(
                        url: authURL,
                        callbackURLScheme: "avalanche-scouting"
                    ) { callbackURL, error in
                        Task { @MainActor in
                            isLoading = false
                            if let error = error {
                                if (error as NSError).code != ASWebAuthenticationSessionError.canceledLogin.rawValue {
                                    errorMessage = error.localizedDescription
                                }
                                return
                            }
                            guard let callbackURL = callbackURL else { return }
                            do {
                                _ = try await SupabaseManager.shared.client.auth.session(from: callbackURL)
                                // Session is set; authStateChanges in AvalancheApp will update UI
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        }
                    }
                    session.presentationContextProvider = AuthSessionContextProvider.shared
                    session.prefersEphemeralWebBrowserSession = false
                    session.start()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

private final class AuthSessionContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = AuthSessionContextProvider()
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            if let w = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first {
                return w
            }
        }
        return scenes.flatMap { $0.windows }.first ?? UIWindow()
    }
}

