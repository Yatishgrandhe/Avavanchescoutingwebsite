import SwiftUI
import WebKit

/// iOS app that loads the full React website (all web pages) in a WKWebView.
private let kWebAppBaseURL = "https://avalanchescouting.vercel.app"

struct HTMLAppView: View {
    @Binding var oauthCallbackURL: URL?
    @State private var isWebLoaded = false

    var body: some View {
        ZStack {
            WebViewContainer(oauthCallbackURL: $oauthCallbackURL, onLoad: {
                withAnimation(.easeOut(duration: 0.25)) { isWebLoaded = true }
            })
            .ignoresSafeArea(edges: .bottom)

            if !isWebLoaded {
                LoadingSplashView()
                    .transition(.opacity)
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .statusBarHidden(true)
    }
}

private struct WebViewContainer: UIViewRepresentable {
    @Binding var oauthCallbackURL: URL?
    var onLoad: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(
            baseHost: (URL(string: kWebAppBaseURL).flatMap { $0.host }) ?? "avalanchescouting.vercel.app",
            onLoad: onLoad
        )
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.processPool = WKProcessPool()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.allowsInlineMediaPlayback = true
        
        // Essential for camera access in iOS 15+ WebViews
        if #available(iOS 15.0, *) {
            config.allowsAirPlayForMediaPlayback = true
        }
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 13/255, green: 20/255, blue: 69/255, alpha: 1)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        loadWebApp(webView: webView, callbackURL: nil)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = oauthCallbackURL, url.scheme == "avalanche-scouting" {
            loadWebApp(webView: webView, callbackURL: url)
            DispatchQueue.main.async { oauthCallbackURL = nil }
        }
    }

    private func loadWebApp(webView: WKWebView, callbackURL: URL?) {
        guard let base = URL(string: kWebAppBaseURL) else { return }
        if let callback = callbackURL, callback.scheme == "avalanche-scouting",
           var comp = URLComponents(url: base, resolvingAgainstBaseURL: false) {
            comp.path = "/auth/callback"
            comp.query = callback.query
            comp.fragment = callback.fragment
            if let u = comp.url {
                webView.load(URLRequest(url: u))
                return
            }
        }
        // When not signed in (no OAuth callback), open the home screen (root).
        var comp = URLComponents(url: base, resolvingAgainstBaseURL: false)
        comp?.path = "/"
        comp?.query = nil
        comp?.fragment = nil
        let homeURL = (comp?.url) ?? base
        webView.load(URLRequest(url: homeURL))
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let baseHost: String
        let onLoad: () -> Void

        init(baseHost: String, onLoad: @escaping () -> Void) {
            self.baseHost = baseHost
            self.onLoad = onLoad
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            onLoad()
        }

        // Handle Camera/Microphone permissions for iOS 15+
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        /// Keep OAuth (Supabase → Discord → callback) in the webview so Safari never opens and the logged-in user returns to the app.
        private func shouldLoadInWebView(host: String) -> Bool {
            if host.isEmpty { return false }
            if host == baseHost || host.hasSuffix("." + baseHost) { return true }
            if host == "discord.com" || host == "www.discord.com" || host.hasSuffix(".discord.com") { return true }
            if host.hasSuffix(".supabase.co") { return true }
            return false
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            if url.scheme == "http" || url.scheme == "https" {
                let host = url.host ?? ""
                if shouldLoadInWebView(host: host) {
                    decisionHandler(.allow)
                    return
                }
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            if url.scheme == "avalanche-scouting" {
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Links that open in new window/tab (e.g. team details, past competition details): load in same webview so they stay in-app.
            guard navigationAction.targetFrame == nil, let url = navigationAction.request.url else { return nil }
            let host = url.host ?? ""
            if shouldLoadInWebView(host: host) {
                webView.load(URLRequest(url: url))
            } else {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}
