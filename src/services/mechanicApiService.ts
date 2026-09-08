import { Mechanic } from '../stores/mechanicStore'

/**
 * API service for mechanics with comprehensive error handling
 */
export class MechanicApiService {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl: string = '/api/mechanics', timeout: number = 10000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Handle API response with error checking
   */
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Operation failed')
    }

    return data
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - server took too long to respond')
      }
      throw error
    }
  }

  /**
   * Get all mechanics
   */
  async getAllMechanics(): Promise<Mechanic[]> {
    try {
      const response = await this.fetchWithTimeout(this.baseUrl)
      const data = await this.handleResponse(response)
      return data.data
    } catch (error) {
      throw new Error(`Failed to fetch mechanics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get mechanic by ID
   */
  async getMechanicById(id: string): Promise<Mechanic> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`)
      const data = await this.handleResponse(response)
      return data.data
    } catch (error) {
      throw new Error(`Failed to fetch mechanic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create new mechanic
   */
  async createMechanic(mechanic: Omit<Mechanic, 'id'>): Promise<Mechanic> {
    try {
      const response = await this.fetchWithTimeout(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(mechanic)
      })
      const data = await this.handleResponse(response)
      return data.data
    } catch (error) {
      throw new Error(`Failed to create mechanic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update mechanic
   */
  async updateMechanic(id: string, updates: Partial<Mechanic>): Promise<Mechanic> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      const data = await this.handleResponse(response)
      return data.data
    } catch (error) {
      throw new Error(`Failed to update mechanic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete mechanic
   */
  async deleteMechanic(id: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      })
      await this.handleResponse(response)
    } catch (error) {
      throw new Error(`Failed to delete mechanic: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Create singleton instance
export const mechanicApiService = new MechanicApiService()

export default mechanicApiService