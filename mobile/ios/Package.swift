// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AvalancheScouting",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "AvalancheScouting",
            targets: ["AvalancheScouting"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase-community/supabase-swift.git", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "AvalancheScouting",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift")
            ]),
    ]
)
