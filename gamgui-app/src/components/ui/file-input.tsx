import * as React from "react"
import { cn } from "@/lib/utils"
import { Upload, X, FileIcon } from "lucide-react"
import { Button } from "./button"

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: File | null
  onChange?: (file: File | null) => void
  onRemove?: () => void
  className?: string
  dropzoneText?: string
  acceptedFileTypes?: string
}

export function FileInput({
  value,
  onChange,
  onRemove,
  className,
  dropzoneText = "Drag and drop a file here, or click to select",
  acceptedFileTypes,
  ...props
}: FileInputProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        if (onChange) {
          onChange(file)
        }
      }
    },
    [onChange]
  )

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0]
        if (onChange) {
          onChange(file)
        }
      }
    },
    [onChange]
  )

  const handleClick = React.useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleRemove = React.useCallback(() => {
    if (onRemove) {
      onRemove()
    } else if (onChange) {
      onChange(null)
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [onChange, onRemove])

  return (
    <div className={cn("relative", className)}>
      {!value ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            className
          )}
        >
          <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
          <p className="mb-1 text-sm font-medium text-center">{dropzoneText}</p>
          <p className="text-xs text-muted-foreground text-center">
            {acceptedFileTypes ? `Accepts: ${acceptedFileTypes}` : ""}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept={acceptedFileTypes}
            {...props}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileIcon className="h-6 w-6 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium truncate">{value.name}</p>
              <p className="text-xs text-muted-foreground">
                {(value.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8"
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}
    </div>
  )
}
