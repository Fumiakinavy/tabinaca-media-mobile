//
//  tabinaca_media_iosApp.swift
//  tabinaca-media-ios
//
//  Created by uehara fumiaki on 2025/12/28.
//

import SwiftUI

@main
struct tabinaca_media_iosApp: App {
    @StateObject private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authStore)
        }
    }
}
