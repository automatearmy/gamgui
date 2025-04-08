import * as React from "react"
import { cn } from "@/lib/utils"

interface TerminalProps {
  className?: string
  onCommand?: (command: string) => void
  output: string[]
}

export function Terminal({ className, onCommand, output = [] }: TerminalProps) {
  const [command, setCommand] = React.useState("")
  const terminalRef = React.useRef<HTMLDivElement>(null)
  
  // Scroll to bottom when output changes
  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output])
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && command.trim() && onCommand) {
      onCommand(command)
      setCommand("")
    }
  }
  
  return (
    <div 
      className={cn("bg-black text-white font-mono p-4 h-full overflow-auto", className)} 
      ref={terminalRef}
    >
      {/* Terminal output */}
      {output.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap">{line}</div>
      ))}
      
      {/* Command input line */}
      <div className="flex">
        <span className="text-green-400">$: &gt;</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-white flex-1 ml-2"
          autoFocus
        />
      </div>
    </div>
  )
}
