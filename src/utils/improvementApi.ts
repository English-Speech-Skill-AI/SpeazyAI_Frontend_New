/**
 * Utility functions for fetching weekly improvement data from the Exelerate API
 * API: GET https://api.intelliviq.com/api/users/improvement-weekly.php
 * Headers: Content-Type: application/json, Authorization: Bearer <token>
 * UI should show overall_improvement_text from response, or "0" if not present.
 */

import { getExelerateApiBase } from "../config/apiConfig"

export interface ImprovementData {
  improvement_percentage?: number;
  improvement?: number;
  percentage?: number;
  weekly_improvement?: number;
  overall_improvement_text?: string;
}

/**
 * Extracts overall_improvement_text from API response (nested or top-level).
 * Returns the string to show in UI, or "0" if missing.
 */
function extractOverallImprovementText(data: unknown): string {
  if (data == null || typeof data !== "object") return "0"
  const obj = data as Record<string, unknown>

  // Nested: { success: true, data: { overall_improvement_text: "...", ... } }
  if (obj.success && obj.data != null && typeof obj.data === "object") {
    const inner = obj.data as Record<string, unknown>
    const text = inner.overall_improvement_text
    if (typeof text === "string" && text.trim()) return text.trim()
  }

  // Top-level overall_improvement_text
  const top = obj.overall_improvement_text
  if (typeof top === "string" && top.trim()) return top.trim()

  return "0"
}

/**
 * Fetches the user's weekly improvement from the Exelerate API.
 * Returns the string to display: overall_improvement_text from the response, or "0" if not present.
 * @param token - The authentication token
 * @returns Promise with display string (overall_improvement_text or "0")
 */
export async function fetchImprovementData(token: string): Promise<string> {
  const url = `${getExelerateApiBase()}/api/users/improvement-weekly.php`
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch improvement data:", response.status, response.statusText)
      return "0"
    }

    const text = await response.text()
    if (!text.trim()) return "0"

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      console.error("Improvement API returned non-JSON:", text.slice(0, 200))
      return "0"
    }

    return extractOverallImprovementText(data)
  } catch (error) {
    console.error("Error fetching improvement data:", error)
    return "0"
  }
}

/** @deprecated Use fetchImprovementData result directly; it now returns display string. */
export function formatImprovement(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) return "0"
  const rounded = Math.round(percentage)
  if (rounded > 0) return `+${rounded}%`
  if (rounded < 0) return `${rounded}%`
  return "0%"
}

