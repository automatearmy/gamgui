import * as React from "react"
import { cn } from "@/lib/utils"
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

// Add global styles for the terminal
const terminalStyles = `
.xterm {
  width: 100% !important;
  height: 100% !important;
}
.xterm-viewport {
  width: 100% !important;
  overflow-x: hidden !important;
}
.xterm-screen {
  width: 100% !important;
}
`;

interface TerminalProps {
  className?: string
  onCommand?: (command: string) => void
  output: string[]
}

export function Terminal({ className, onCommand, output = [] }: TerminalProps) {
  // Removed unused state variables
  const terminalRef = React.useRef<HTMLDivElement>(null)
  const xtermRef = React.useRef<XTerm | null>(null)
  const processedLinesRef = React.useRef<Set<string>>(new Set())
  
  // Add global styles once
  React.useEffect(() => {
    // Create style element if it doesn't exist yet
    const existingStyle = document.getElementById('xterm-custom-styles');
    if (!existingStyle) {
      const styleEl = document.createElement('style');
      styleEl.id = 'xterm-custom-styles';
      styleEl.innerHTML = terminalStyles;
      document.head.appendChild(styleEl);
    }
    
    // Cleanup when component unmounts
    return () => {
      const styleEl = document.getElementById('xterm-custom-styles');
      if (styleEl) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);
  
  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (xtermRef.current && terminalRef.current) {
        // Calculate available width in characters
        const availableWidth = terminalRef.current.clientWidth - 30; // Account for padding and border
        const fontSize = xtermRef.current.options.fontSize || 14;
        const charWidth = fontSize * 0.6;
        const cols = Math.floor(availableWidth / charWidth);
        
        if (cols >= 10) {
          xtermRef.current.resize(cols, xtermRef.current.rows);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Auto-focus on the terminal when clicking anywhere in the container
  React.useEffect(() => {
    if (!terminalRef.current) return;
    
    const handleContainerClick = () => {
      if (xtermRef.current) {
        xtermRef.current.focus();
      }
    };
    
    terminalRef.current.addEventListener('click', handleContainerClick);
    
    return () => {
      terminalRef.current?.removeEventListener('click', handleContainerClick);
    };
  }, []);
  
  // Initialize terminal
  React.useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#f5f5f5',
        foreground: '#333333',
        cursor: '#333333',
        cursorAccent: '#f5f5f5',
        selectionBackground: 'rgba(51, 51, 51, 0.3)',
        black: '#333333',
        red: '#e01e1e',
        green: '#0f8641',
        yellow: '#c49008',
        blue: '#0550ae',
        magenta: '#b026b0',
        cyan: '#076870',
        white: '#f5f5f5',
      },
      scrollback: 1000,
      rows: 20,
      convertEol: true,
      disableStdin: false
    })
    
    // Store ref
    xtermRef.current = terminal
    
    // Open terminal
    terminal.open(terminalRef.current)
    
    // Apply custom styling to make terminal fill container
    if (terminalRef.current) {
      const xtermElement = terminalRef.current.querySelector('.xterm');
      if (xtermElement instanceof HTMLElement) {
        xtermElement.style.width = '100%';
        xtermElement.style.height = '100%';
        
        const xtermScreen = xtermElement.querySelector('.xterm-screen');
        if (xtermScreen instanceof HTMLElement) {
          xtermScreen.style.width = '100%';
        }
        
        const xtermViewport = xtermElement.querySelector('.xterm-viewport');
        if (xtermViewport instanceof HTMLElement) {
          xtermViewport.style.width = '100%';
        }
      }
    }
    
    // Calculate size to fit container
    const setOptimalSize = () => {
      if (terminalRef.current) {
        const availableWidth = terminalRef.current.clientWidth - 30; // Account for padding and border
        const fontSize = terminal.options.fontSize || 14;
        const charWidth = fontSize * 0.6;
        const cols = Math.floor(availableWidth / charWidth);
        
        // Calculate rows based on container height
        const availableHeight = terminalRef.current.clientHeight - 30;
        const lineHeight = fontSize * 1.2;
        const rows = Math.max(10, Math.floor(availableHeight / lineHeight));
        
        if (cols >= 10) {
          terminal.resize(cols, rows);
        }
      }
    };
    
    // Set size after a slight delay to ensure DOM is ready
    setTimeout(setOptimalSize, 50);
    
    // Handle commands
    if (onCommand) {
      let currentCommand = ""
      
      terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey
        
        if (domEvent.key === 'Enter') {
          terminal.write('\r\n')
          if (currentCommand.trim() && onCommand) {
            onCommand(currentCommand)
          }
          currentCommand = ""
          // Avoid delay in showing prompt to prevent blinking
          terminal.write('\x1b[32m$>\x1b[0m ')
        } else if (domEvent.key === 'Backspace') {
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.slice(0, -1)
            terminal.write('\b \b')
          }
        } else if (printable) {
          currentCommand += key
          terminal.write(key)
        }
      })
      
      // Initial prompt - simplified to match standard shells
      terminal.write('\x1b[32m$>\x1b[0m ')
    }
    
    // Write initial output if any
    if (output.length > 0) {
      output.forEach(line => {
        terminal.writeln(line)
        processedLinesRef.current.add(line)
      })
      // Scroll to bottom after initial output
      terminal.scrollToBottom()
    }
    
    // Maintain focus
    const maintainTerminalFocus = () => {
      if (document.activeElement !== document.body) return;
      terminal.focus();
    };
    
    // Focus handlers
    document.addEventListener('click', maintainTerminalFocus);
    window.addEventListener('focus', maintainTerminalFocus);
    
    // Set initial focus
    setTimeout(() => terminal.focus(), 100);
    
    // Clean up
    return () => {
      document.removeEventListener('click', maintainTerminalFocus);
      window.removeEventListener('focus', maintainTerminalFocus);
      terminal.dispose();
    }
  }, [onCommand])
  
  // Update terminal with output
  React.useEffect(() => {
    if (!xtermRef.current) return
    
    const terminal = xtermRef.current
    
    // Handle output clearing
    if (output.length === 0) {
      terminal.clear()
      processedLinesRef.current.clear()
      
      // Re-display prompt with consistent format
      if (onCommand) {
        terminal.write('\x1b[32m$>\x1b[0m ')
      }
      return
    }
    
    // Process any new lines that haven't been displayed yet
    let hasNewContent = false
    for (const line of output) {
      if (!processedLinesRef.current.has(line)) {
        terminal.writeln(line)
        processedLinesRef.current.add(line)
        hasNewContent = true
      }
    }
    
    if (hasNewContent) {
      // Ensure re-focus and scroll to bottom
      terminal.scrollToBottom()
      // Always maintain focus - very important!
      terminal.focus()
    }
  }, [output, onCommand])
  
  return (
    <div 
      className={cn("w-full h-full flex flex-col", className)}
      onClick={() => xtermRef.current?.focus()}
    >
      <div 
        className="flex-1 overflow-hidden rounded-md border border-gray-200 p-2"
        style={{ minHeight: '300px', maxHeight: '800px', position: 'relative' }}
        ref={terminalRef}
      />
    </div>
  )
}
