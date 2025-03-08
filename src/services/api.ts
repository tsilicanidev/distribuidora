import { ErrorHandler } from '../utils/testUtils';
import { aiService } from '../services/ai';
import { parseTokenFromUrl, validateToken } from '../utils/token';

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class APIService {
  private async getAuthHeaders(): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Try to get token from URL first
    const urlToken = parseTokenFromUrl();
    if (urlToken) {
      // Validate token
      const validation = await validateToken(urlToken);
      if (validation.valid) {
        headers.append('Authorization', `Bearer ${urlToken}`);
        return headers;
      }
    }

    // Fall back to session token if URL token is invalid or not present
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.append('Authorization', `Bearer ${session.access_token}`);
    }

    return headers;
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    retries = 3
  ): Promise<T> {
    try {
      // Check for potential issues
      const anomalyData = await aiService.detectAnomalies([
        { type: 'api_request', url, method }
      ]);

      if (anomalyData.confidence < 0.8) {
        console.warn('API request may be risky:', { url, method });
      }

      // Get auth headers
      const headers = await this.getAuthHeaders();

      // Make request with retry logic
      return await ErrorHandler.retry(
        async () => {
          const response = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined
          });

          if (!response.ok) {
            throw new APIError(
              'Request failed',
              response.status,
              response.statusText
            );
          }

          return response.json();
        },
        retries,
        1000
      );
    } catch (error) {
      // Log error for analysis
      await aiService.detectAnomalies([
        { type: 'api_error', url, method, error: error.message }
      ]);

      throw error;
    }
  }

  public async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  public async post<T>(url: string, data: any): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  public async put<T>(url: string, data: any): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  public async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }
}

export const api = new APIService();