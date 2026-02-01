import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        let supabaseURL = URL(string: "https://ylzahxkfmklwcgkogeff.supabase.co")!
        let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE"
        
        self.client = SupabaseClient(supabaseURL: supabaseURL, supabaseKey: supabaseKey)
    }
}
