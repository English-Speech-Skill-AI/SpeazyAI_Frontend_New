/**
 * Utility functions for PDF text extraction using ChatGPT API
 * and managing PDF text cache in browser storage
 */

import { API_URLS } from '@/config/apiConfig';

const PDF_TEXT_CACHE_PREFIX = 'pdfText_'
const PDF_TEXT_CACHE_KEYS = 'pdfTextCacheKeys'

/**
 * Get all PDF text cache keys from localStorage
 */
export const getPdfTextCacheKeys = (): string[] => {
  try {
    const keysJson = localStorage.getItem(PDF_TEXT_CACHE_KEYS)
    if (!keysJson) return []
    return JSON.parse(keysJson)
  } catch (error) {
    console.error('Error reading PDF cache keys:', error)
    return []
  }
}

/**
 * Add a cache key to the list
 */
const addPdfTextCacheKey = (lessonId: string) => {
  try {
    const keys = getPdfTextCacheKeys()
    if (!keys.includes(lessonId)) {
      keys.push(lessonId)
      localStorage.setItem(PDF_TEXT_CACHE_KEYS, JSON.stringify(keys))
    }
  } catch (error) {
    console.error('Error adding PDF cache key:', error)
  }
}

/**
 * Store extracted PDF text in localStorage
 */
export const storePdfText = (lessonId: string, text: string): void => {
  try {
    const cacheKey = `${PDF_TEXT_CACHE_PREFIX}${lessonId}`
    localStorage.setItem(cacheKey, text)
    addPdfTextCacheKey(lessonId)
  } catch (error) {
    console.error('Error storing PDF text:', error)
    throw error
  }
}

/**
 * Retrieve extracted PDF text from localStorage
 */
export const getPdfText = (lessonId: string): string | null => {
  try {
    const cacheKey = `${PDF_TEXT_CACHE_PREFIX}${lessonId}`
    return localStorage.getItem(cacheKey)
  } catch (error) {
    console.error('Error retrieving PDF text:', error)
    return null
  }
}

/**
 * Clear all PDF text cache from localStorage
 */
export const clearAllPdfTextCache = (): void => {
  try {
    const keys = getPdfTextCacheKeys()
    keys.forEach((lessonId) => {
      const cacheKey = `${PDF_TEXT_CACHE_PREFIX}${lessonId}`
      localStorage.removeItem(cacheKey)
    })
    localStorage.removeItem(PDF_TEXT_CACHE_KEYS)
  } catch (error) {
    console.error('Error clearing PDF cache:', error)
  }
}

/**
 * Extract text from PDF using pdf.js from CDN (client-side extraction)
 * Fetches PDF as blob first to handle CORS issues
 */
const extractTextFromPdf = async (pdfUrl: string): Promise<string> => {
  try {
    // Load pdf.js from CDN
    const pdfjsVersion = '3.11.174' // Use a specific version
    const pdfjsLib = (window as any).pdfjsLib
    
    // If pdf.js is not loaded, load it from CDN
    if (!pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.min.js`
        script.onload = () => {
          // Set worker source
          ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`
          resolve()
        }
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const pdfjs = (window as any).pdfjsLib
    if (!pdfjs) {
      throw new Error('Failed to load pdf.js library')
    }

    // Fetch PDF as blob first to handle CORS issues
    // This approach works better with CORS-restricted resources
    let pdfData: ArrayBuffer | string
    
    try {
      // Try to fetch as blob first (handles CORS better)
      const response = await fetch(pdfUrl, {
        mode: 'cors',
        credentials: 'omit',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      pdfData = await blob.arrayBuffer()
    } catch (fetchError: any) {
      // If direct fetch fails due to CORS, try using proxy
      console.warn('Direct fetch failed, trying proxy:', fetchError.message)
      
      try {
        const isLocal = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1'
        )
        
        const proxyUrl = isLocal
          ? `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}` // Local proxy (if you create one)
          : `${API_URLS.pdfProxy}?url=${encodeURIComponent(pdfUrl)}` // Netlify or DigitalOcean function
        
        const proxyResponse = await fetch(proxyUrl)
        
        if (!proxyResponse.ok) {
          throw new Error(`Proxy failed: ${proxyResponse.status}`)
        }
        
        // Proxy returns PDF as blob
        const blob = await proxyResponse.blob()
        pdfData = await blob.arrayBuffer()
      } catch (proxyError: any) {
        // Last resort: try using the URL directly with pdf.js
        // Some servers allow pdf.js to load even if fetch fails
        console.warn('Proxy also failed, trying URL directly:', proxyError.message)
        pdfData = pdfUrl
      }
    }

    // Load the PDF using the blob data or URL
    const loadingTask = pdfjs.getDocument({
      data: pdfData instanceof ArrayBuffer ? pdfData : undefined,
      url: pdfData instanceof ArrayBuffer ? undefined : pdfData as string,
      withCredentials: false,
      httpHeaders: {},
    })
    
    const pdf = await loadingTask.promise

    let fullText = ''

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }

    return fullText.trim()
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    
    // Provide more helpful error message
    if (error instanceof Error) {
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('PDF cannot be accessed due to CORS restrictions. Please ensure the PDF server allows cross-origin requests.')
      }
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
    
    throw new Error(`Failed to extract text from PDF: Unknown error`)
  }
}

/**
 * Process extracted text with ChatGPT API for better formatting and structure
 */
const processTextWithChatGPT = async (
  extractedText: string,
  apiKey?: string
): Promise<string> => {
  try {
    // Determine API endpoint
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    )

    const apiUrl = isLocal
      ? 'http://localhost:4001/pdfExtractProxy' // Local proxy (port 4001 for chatgptProxy)
      : API_URLS.pdfExtractProxy // Netlify or DigitalOcean function for PDF extraction

    // Truncate text if too long (ChatGPT has token limits)
    const maxLength = 100000 // Approximate character limit
    const textToProcess = extractedText.length > maxLength 
      ? extractedText.substring(0, maxLength) + '\n\n[... content truncated ...]'
      : extractedText

    const prompt = `Please extract only the main content text from the following PDF text. Exclude chapter titles, unit titles, headers, page numbers, image captions, and any other structural elements. Only return the paragraph content (the actual story text or body content). Do not include titles like "Unit 1", "Chapter X", or section headers. Return only the paragraph text without any commentary:\n\n${textToProcess}`

    // Use proxy approach (recommended for security)
    // Add timeout to avoid hanging if server is not running
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extracted_text: textToProcess,
          prompt: prompt,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        // Only log if it's not a connection error (those are expected if server isn't running)
        if (!errorText.includes('ECONNREFUSED') && !response.status.toString().startsWith('5')) {
          console.warn('ChatGPT API error, using raw extracted text:', errorText)
        }
        // Fallback to raw extracted text if API fails
        return extractedText
      }

      const data = await response.json()
      const processedText = data.text || data.content || extractedText
      
      return processedText || extractedText
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      // Check if it's a connection error (server not running)
      if (fetchError.name === 'AbortError' || 
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('ERR_CONNECTION_REFUSED') ||
          fetchError.message?.includes('NetworkError')) {
        // Silently fall back to raw text if proxy server isn't running
        // This is expected behavior in development if the proxy isn't started
        return extractedText
      }
      
      // For other errors, log and fall back
      console.warn('Error processing text with ChatGPT, using raw extracted text:', fetchError.message)
      return extractedText
    }
  } catch (error) {
    // Fallback to raw extracted text if any error occurs
    return extractedText
  }
}

/**
 * Extract text from PDF using pdf.js and optionally process with ChatGPT API
 * This function handles the entire process: fetch PDF, extract text, process with ChatGPT
 * 
 * @param pdfUrl - URL of the PDF file to extract text from
 * @param options - Configuration options
 * @returns Promise<string> - Extracted and processed text
 */
export const extractPdfText = async (
  pdfUrl: string,
  options?: {
    useChatGPT?: boolean
    apiKey?: string
    silent?: boolean // If true, suppresses console logs
  }
): Promise<string> => {
  try {
    // Step 1: Extract text from PDF using pdf.js
    const rawText = await extractTextFromPdf(pdfUrl)

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF')
    }

    if (!options?.silent) {
      console.log('✓ PDF text extracted:', rawText.length, 'characters')
    }

    // Step 2: Optionally process with ChatGPT API
    if (options?.useChatGPT !== false) {
      try {
        const processedText = await processTextWithChatGPT(rawText, options?.apiKey)
        if (!options?.silent) {
          console.log('✓ ChatGPT processing complete:', processedText.length, 'characters')
        }
        return processedText
      } catch (error) {
        if (!options?.silent) {
          console.warn('⚠ ChatGPT processing failed, using raw extracted text')
        }
        return rawText
      }
    }

    return rawText
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error)
    throw error
  }
}

/**
 * Main reusable function: Get PDF text for a lesson (with caching)
 * This is the primary function to use throughout the app for PDF text extraction.
 * It handles caching, extraction, and storage automatically.
 * 
 * @param lessonId - Unique identifier for the lesson
 * @param pdfUrl - URL of the PDF file (required if not cached)
 * @param options - Configuration options
 * @returns Promise<string> - Extracted text (from cache or newly extracted)
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const text = await getPdfTextForLesson('lesson-123', 'https://example.com/file.pdf')
 * 
 * // With options
 * const text = await getPdfTextForLesson('lesson-123', 'https://example.com/file.pdf', {
 *   useChatGPT: true,
 *   forceRefresh: true,
 *   onProgress: (stage) => console.log(stage)
 * })
 * ```
 */
export const getPdfTextForLesson = async (
  lessonId: string,
  pdfUrl?: string,
  options?: {
    useChatGPT?: boolean
    apiKey?: string
    forceRefresh?: boolean // If true, re-extract even if cached
    silent?: boolean // If true, suppresses console logs
    onProgress?: (stage: 'checking-cache' | 'extracting' | 'processing' | 'storing' | 'complete') => void
  }
): Promise<string> => {
  // Step 1: Check cache (unless force refresh)
  if (!options?.forceRefresh) {
    const cachedText = getPdfText(lessonId)
    if (cachedText) {
      if (!options?.silent) {
        console.log('✓ Using cached PDF text for lesson:', lessonId)
      }
      if (options?.onProgress) {
        options.onProgress('complete')
      }
      return cachedText
    }
  }

  // Step 2: Validate PDF URL
  if (!pdfUrl) {
    throw new Error('PDF URL is required when text is not cached')
  }

  if (options?.onProgress) {
    options.onProgress('extracting')
  }

  // Step 3: Extract text from PDF
  const extractedText = await extractPdfText(pdfUrl, {
    useChatGPT: options?.useChatGPT,
    apiKey: options?.apiKey,
    silent: options?.silent,
  })

  if (options?.onProgress) {
    options.onProgress('storing')
  }

  // Step 4: Store in cache
  storePdfText(lessonId, extractedText)

  if (!options?.silent) {
    console.log('=== PDF Text Extraction Complete ===')
    console.log('Lesson ID:', lessonId)
    console.log('PDF URL:', pdfUrl)
    console.log('Extracted Text Length:', extractedText.length, 'characters')
    console.log('Extracted Text:', extractedText)
    console.log('===================================')
  }

  if (options?.onProgress) {
    options.onProgress('complete')
  }

  return extractedText
}

/**
 * Check if PDF text is already cached
 */
export const isPdfTextCached = (lessonId: string): boolean => {
  return getPdfText(lessonId) !== null
}

/**
 * Truncate text to a maximum number of words (for API requirements)
 * Tries to preserve sentence boundaries when possible
 * 
 * @param text - Text to truncate
 * @param maxWords - Maximum number of words (default: 300)
 * @returns Truncated text
 */
export const truncateTextToWords = (text: string, maxWords: number = 300): string => {
  if (!text || text.trim().length === 0) {
    return ""
  }

  // Split into words
  const words = text.trim().split(/\s+/)
  
  // If text is already under the limit, return as is
  if (words.length <= maxWords) {
    return text.trim()
  }

  // Take first maxWords words
  const truncatedWords = words.slice(0, maxWords)
  let truncatedText = truncatedWords.join(" ")

  // Try to end at a sentence boundary (period, exclamation, question mark)
  const lastSentenceEnd = Math.max(
    truncatedText.lastIndexOf("."),
    truncatedText.lastIndexOf("!"),
    truncatedText.lastIndexOf("?")
  )

  // If we found a sentence boundary in the last 50 characters, use it
  if (lastSentenceEnd > truncatedText.length - 50 && lastSentenceEnd > 0) {
    truncatedText = truncatedText.substring(0, lastSentenceEnd + 1)
  } else {
    // Otherwise, add ellipsis to indicate truncation
    truncatedText = truncatedText.trim() + "..."
  }

  return truncatedText.trim()
}

