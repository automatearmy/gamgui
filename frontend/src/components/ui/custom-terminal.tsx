import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CustomTerminalProps = {
  output: string[];
  onCommand?: (command: string) => void;
  className?: string;
};

export function CustomTerminal({ output, onCommand, className }: CustomTerminalProps) {
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && onCommand) {
      onCommand(currentCommand.trim());
      setCommandHistory(prev => [...prev, currentCommand.trim()]);
      setCurrentCommand("");
      setHistoryIndex(-1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex] || "");
      }
    }
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand("");
        }
        else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || "");
        }
      }
    }
  };

  return (
    <div
      className={cn(
        "h-full p-4 bg-[#1e1e1e] text-[#e0e0e0] font-mono text-sm flex flex-col overflow-hidden",
        className,
      )}
      onClick={handleTerminalClick}
    >
      {/* Output area with hidden scrollbar */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ minHeight: 0 }}
      >
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
            {line}
          </div>
        ))}
        {output.length === 0 && (
          <div className="text-gray-500 italic">
            Welcome to the terminal. Type commands to interact with the session.
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center mt-2">
          <span className="text-[#e0e0e0] mr-2 flex-shrink-0 font-bold">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={e => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-green-400 outline-none placeholder-gray-500 focus:placeholder-gray-400"
            placeholder="Type a command..."
            autoFocus
          />
        </form>
      </div>

      {/* Input area - fixed at bottom */}

    </div>
  );
}
