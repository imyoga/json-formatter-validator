"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { jsonrepair } from "jsonrepair"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, XCircle, Sparkles, Copy, Download, Minimize2, ArrowRight, Zap, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Enhanced error information interface
interface JsonError {
  message: string
  line?: number
  column?: number
  position?: number
}

// Function to parse JSON error and extract position info
function parseJsonError(error: Error): JsonError {
  const message = error.message
  
  // Extract position from error message like "Unexpected token } in JSON at position 7"
  const positionMatch = message.match(/at position (\d+)/)
  const position = positionMatch ? parseInt(positionMatch[1]) : undefined
  
  // Extract line and column if available
  const lineColumnMatch = message.match(/line (\d+) column (\d+)/)
  const line = lineColumnMatch ? parseInt(lineColumnMatch[1]) : undefined
  const column = lineColumnMatch ? parseInt(lineColumnMatch[2]) : undefined
  
  return { message, line, column, position }
}

// Function to calculate line and column from position
function getLineColumnFromPosition(text: string, position: number): { line: number; column: number } {
  const lines = text.substring(0, position).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

// Professional auto-fix function using jsonrepair library
function autoFixJson(jsonString: string): string {
  try {
    // Use the professional jsonrepair library which handles:
    // - Missing quotes around keys and values
    // - Missing commas and closing brackets
    // - Single quotes to double quotes conversion
    // - Trailing commas removal
    // - Python constants (None, True, False)
    // - Comments removal (/* */ and //)
    // - Escape character fixes
    // - JSONP notation removal
    // - MongoDB data types
    // - Concatenated strings
    // - And many more edge cases
    return jsonrepair(jsonString)
  } catch (error) {
    // If jsonrepair fails, fall back to the original input
    // This ensures we don't break the user's input completely
    console.warn('jsonrepair failed:', error)
    return jsonString
  }
}

// Custom component for textarea with line numbers and error highlighting
interface LineNumberTextareaProps {
  value: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  errorInfo?: JsonError | null
}

function LineNumberTextarea({ value, onChange, placeholder, readOnly, className, errorInfo }: LineNumberTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const lines = value.split('\n')
  const lineCount = lines.length

  // Calculate error position
  let errorLine: number | undefined
  let errorColumn: number | undefined

  if (errorInfo) {
    if (errorInfo.line && errorInfo.column) {
      errorLine = errorInfo.line
      errorColumn = errorInfo.column
    } else if (errorInfo.position !== undefined) {
      const calc = getLineColumnFromPosition(value, errorInfo.position)
      errorLine = calc.line
      errorColumn = calc.column
    }
  }

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll)
      return () => textarea.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="relative flex">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 bg-gray-750 border-r border-gray-600 text-gray-400 text-xs font-['Roboto_Mono'] leading-relaxed overflow-hidden"
        style={{
          width: `${Math.max(2, Math.floor(Math.log10(lineCount)) + 1) * 0.6 + 1}rem`,
          maxHeight: '650px'
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i + 1}
            className={`px-2 text-right select-none ${
              errorLine === i + 1 ? 'bg-red-900 text-red-300' : ''
            }`}
            style={{ height: '1.5rem', lineHeight: '1.5rem' }}
          >
            {i + 1}
            {errorLine === i + 1 && (
              <span className="ml-1 text-red-400">⚠</span>
            )}
          </div>
        ))}
      </div>
      
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${className} rounded-l-none border-l-0 ${
          errorLine ? 'border-red-600' : ''
        }`}
      />
      
      {/* Error position indicator */}
      {errorLine && errorColumn && !readOnly && (
        <div className="absolute left-0 top-0 pointer-events-none">
          <div
            className="text-red-400 font-bold"
            style={{
              position: 'absolute',
              left: `${Math.max(2, Math.floor(Math.log10(lineCount)) + 1) * 0.6 + 1}rem`,
              top: `${(errorLine - 1) * 1.5}rem`,
              fontSize: '12px',
              lineHeight: '1.5rem',
              paddingLeft: `${(errorColumn - 1) * 0.6}ch`
            }}
          >
            ↑
          </div>
        </div>
      )}
    </div>
  )
}

export default function JsonFormatter() {
  const [jsonInput, setJsonInput] = useState("")
  const [formattedJson, setFormattedJson] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorInfo, setErrorInfo] = useState<JsonError | null>(null)
  const { toast } = useToast()

  const validateAndFormat = useCallback((input: string) => {
    if (!input.trim()) {
      setIsValid(null)
      setErrorInfo(null)
      setFormattedJson("")
      return
    }

    try {
      const parsed = JSON.parse(input)
      setIsValid(true)
      setErrorInfo(null)
      // Auto-format with 2 spaces indentation
      setFormattedJson(JSON.stringify(parsed, null, 2))
    } catch (err) {
      setIsValid(false)
      const errorInfo = parseJsonError(err instanceof Error ? err : new Error("Invalid JSON"))
      setErrorInfo(errorInfo)
      setFormattedJson("")
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJsonInput(value)
    validateAndFormat(value)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonInput(content)
        validateAndFormat(content)
      }
      reader.readAsText(file)
    }
  }

  const tryAutoFix = () => {
    if (jsonInput && !isValid) {
      try {
        const fixed = autoFixJson(jsonInput)
        setJsonInput(fixed)
        validateAndFormat(fixed)
        
        toast({
          title: "Auto-fix successful!",
          description: "JSON has been repaired using professional algorithms. Please review the changes.",
          duration: 3000,
        })
      } catch (error) {
        toast({
          title: "Auto-fix failed",
          description: "Could not automatically repair this JSON. Please fix manually.",
          duration: 3000,
          variant: "destructive"
        })
      }
    }
  }

  const beautifyJson = () => {
    if (isValid && jsonInput) {
      try {
        const parsed = JSON.parse(jsonInput)
        const beautified = JSON.stringify(parsed, null, 2)
        setFormattedJson(beautified)
      } catch (err) {
        console.error("Error beautifying JSON:", err)
      }
    }
  }

  const minifyJson = () => {
    if (isValid && jsonInput) {
      try {
        const parsed = JSON.parse(jsonInput)
        const minified = JSON.stringify(parsed)
        setFormattedJson(minified)
      } catch (err) {
        console.error("Error minifying JSON:", err)
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson)
    toast({
      title: "Copied!",
      description: "JSON copied to clipboard",
      duration: 2000,
    })
  }

  const downloadJson = () => {
    if (formattedJson) {
      const blob = new Blob([formattedJson], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "formatted.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-gray-200">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-100">JSON Formatter & Validator</h1>
          {isValid === false && errorInfo && (
            <Alert variant="destructive" className="ml-4 bg-red-900 border-red-800 w-auto max-w-md">
              <AlertTriangle className="h-4 w-4 text-white" />
              <AlertDescription className="text-sm text-white">
                <div className="font-medium mb-1">JSON Error:</div>
                <div className="text-xs">{errorInfo.message}</div>
                {(errorInfo.line || errorInfo.position !== undefined) && (
                  <div className="text-xs mt-1 opacity-80">
                    {errorInfo.line ? `Line ${errorInfo.line}` : ''}
                    {errorInfo.line && errorInfo.column ? `, Column ${errorInfo.column}` : ''}
                    {errorInfo.position !== undefined && !errorInfo.line ? `Position ${errorInfo.position}` : ''}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* Input Section */}
          <Card className="h-fit bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-100">
                  <FileText className="w-4 h-4" />
                  JSON Input
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isValid === true && (
                    <Badge variant="default" className="bg-green-700 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                  {isValid === false && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* JSON Input Textarea with Line Numbers and Error Highlighting */}
              <LineNumberTextarea
                placeholder="Paste your JSON here..."
                value={jsonInput}
                onChange={handleInputChange}
                errorInfo={errorInfo}
                className="min-h-[650px] font-['Roboto_Mono'] text-xs leading-relaxed bg-gray-800 border-gray-700 text-gray-100 resize-none"
              />
            </CardContent>
          </Card>

          {/* Action Buttons Divider */}
          <div className="flex flex-col items-center justify-center min-h-[600px]">
            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md p-4 space-y-3 w-40">
              <Button variant="outline" size="sm" className="w-full relative overflow-hidden bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 transition-colors">
                <Upload className="w-3 h-3 mr-1" />
                Upload JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </Button>

              {/* Auto-fix button for invalid JSON */}
              {isValid === false && (
                <Button
                  onClick={tryAutoFix}
                  variant="outline"
                  size="sm"
                  className="w-full bg-yellow-700 border-yellow-600 text-yellow-100 hover:bg-yellow-600 hover:border-yellow-500 transition-colors"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Auto Fix
                </Button>
              )}

              <div className="border-t border-gray-700 pt-3">
                <div className="text-center mb-3">
                  <ArrowRight className="w-5 h-5 mx-auto text-gray-400" />
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={beautifyJson}
                    disabled={!isValid}
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Beautify
                  </Button>

                  <Button
                    onClick={minifyJson}
                    disabled={!isValid}
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minimize2 className="w-3 h-3 mr-1" />
                    Minify
                  </Button>
                </div>
              </div>

              <div className="border-gray-700 space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={!formattedJson}
                  className="w-full bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadJson}
                  disabled={!formattedJson}
                  className="w-full bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <Card className="h-fit bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-100">
                <Sparkles className="w-4 h-4" />
                Formatted JSON
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {formattedJson ? (
                <LineNumberTextarea
                  value={formattedJson}
                  readOnly
                  className="min-h-[650px] font-['Roboto_Mono'] text-xs leading-relaxed bg-gray-800 border-gray-700 text-gray-100 resize-none"
                />
              ) : (
                <div className="min-h-[650px] border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center bg-gray-800">
                  <div className="text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Formatted JSON will appear here</p>
                    <p className="text-xs">Enter valid JSON on the left to see the result</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
