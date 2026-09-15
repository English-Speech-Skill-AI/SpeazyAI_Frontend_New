/**
 * Utility functions for fetching app usage time from the analytics API
 */

export interface UsageTimeData {
  total_seconds: number;
  total_minutes: number;
  total_hours: number;
  formatted_time?: string;
}

// Track the last time usage-time.php was called
let lastUsageTimeCall: number | null = null;

/**
 * Gets the timestamp of the last usage-time.php API call
 * @returns Timestamp in milliseconds or null if never called
 */
export function getLastUsageTimeCall(): number | null {
  return lastUsageTimeCall;
}

/**
 * Checks if 10 minutes have passed since the last usage-time.php call
 * @returns true if 10 minutes have passed or if never called, false otherwise
 */
export function shouldRefreshUsageTime(): boolean {
  if (lastUsageTimeCall === null) {
    return true; // Never called, should refresh
  }
  const tenMinutesInMs = 10 * 60 * 1000;
  return Date.now() - lastUsageTimeCall >= tenMinutesInMs;
}

/**
 * Formats seconds into a human-readable time string (e.g., "2h 45m", "45m", "1h")
 * @param totalSeconds - Total seconds to format
 * @returns Formatted time string
 */
export function formatUsageTime(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return '< 1m';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Fetches the user's total app usage time from the analytics API
 * @param token - The authentication token
 * @returns Promise with usage time in seconds or null if request fails
 */
export async function fetchUsageTime(token: string): Promise<number | null> {
  try {
    // Update the last call timestamp
    lastUsageTimeCall = Date.now();
    
    const response = await fetch('https://api.intelliviq.com/api/analytics/usage-time.php', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch usage time:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Handle different response formats
    if (data.success && data.data) {
      // Check for nested total object structure (data.data.total.seconds)
      if (data.data.total && data.data.total.seconds !== undefined) {
        return data.data.total.seconds;
      }
      // Check for nested today object structure (data.data.today.seconds) - fallback
      if (data.data.today && data.data.today.seconds !== undefined) {
        return data.data.today.seconds;
      }
      // Legacy formats for backward compatibility
      if (data.data.total_seconds !== undefined) {
        return data.data.total_seconds;
      } else if (data.data.total_minutes !== undefined) {
        return data.data.total_minutes * 60;
      } else if (data.data.total_hours !== undefined) {
        return data.data.total_hours * 3600;
      } else if (data.data.usage_time_seconds !== undefined) {
        return data.data.usage_time_seconds;
      }
    } else if (data.total_seconds !== undefined) {
      // Direct response format
      return data.total_seconds;
    } else if (data.usage_time_seconds !== undefined) {
      return data.usage_time_seconds;
    }

    return null;
  } catch (error) {
    console.error('Error fetching usage time:', error);
    return null;
  }
}

