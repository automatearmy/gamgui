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
        "h-full bg-gray-900 text-green-400 font-mono text-sm flex flex-col rounded-md overflow-hidden",
        className,
      )}
      onClick={handleTerminalClick}
    >
      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600"
        style={{ minHeight: 0 }}
      >
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words">
            {line}
          </div>
        ))}
        {output.length === 0 && (
          <div className="text-gray-500">
            Welcome to the terminal. Type commands to interact with the session.
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="text-green-400 mr-2 flex-shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={e => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-green-400 outline-none placeholder-gray-500"
            placeholder="Type a command..."
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
