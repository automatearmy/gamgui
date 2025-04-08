import { Sidebar } from "@/components/sidebar";
import { SessionsPage } from "@/pages/sessions";

function App() {
  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar 
        userProfileProps={{
          name: "Bruno Oliveira",
          role: "Administrator"
        }}
      />
      
      {/* Main content */}
      <main className="flex-1 p-6 md:ml-64">
        <SessionsPage />
      </main>
    </div>
  )
}

export default App
