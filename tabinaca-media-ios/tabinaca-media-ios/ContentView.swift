//
//  ContentView.swift
//  tabinaca-media-ios
//
//  Created by uehara fumiaki on 2025/12/28.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        RootTabView()
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthStore())
}
