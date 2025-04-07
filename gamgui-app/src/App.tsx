import { Sidebar } from "@/components/sidebar"

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
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold">GAMGUI Dashboard</h1>
          <p>Welcome to the GAMGUI MVP. This is the main content area where your application content will be displayed.</p>
        </div>
      </main>
    </div>
  )
}

export default App
