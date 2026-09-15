/**
 * Utility functions for fetching streak data from the analytics API
 */

export interface StreakData {
  streak_days: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
}

/**
 * Fetches the user's streak data from the analytics API
 * @param token - The authentication token
 * @returns Promise with streak data or null if request fails
 */
export async function fetchStreakData(token: string): Promise<StreakData | null> {
  try {
    const response = await fetch('https://api.intelliviq.com/api/analytics/my-streak.php', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch streak data:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Handle different response formats
    if (data.success && data.data) {
      return {
        streak_days: data.data.streak_days || data.data.current_streak || 0,
        current_streak: data.data.current_streak || data.data.streak_days || 0,
        longest_streak: data.data.longest_streak || 0,
        last_activity_date: data.data.last_activity_date,
      };
    } else if (data.streak_days !== undefined) {
      // Direct response format
      return {
        streak_days: data.streak_days || 0,
        current_streak: data.current_streak || data.streak_days || 0,
        longest_streak: data.longest_streak || 0,
        last_activity_date: data.last_activity_date,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching streak data:', error);
    return null;
  }
}

