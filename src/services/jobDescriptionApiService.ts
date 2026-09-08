import { JobDescriptionFormData, JobDescriptionWithPricing } from '../types/jobDescription'

/**
 * API service for job descriptions with comprehensive error handling and pricing calculation
 */
export class JobDescriptionApiService {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl: string = '/api/job-descriptions', timeout: number = 10000) {
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
   * Transform API data to ensure proper types (convert Date objects to strings)
   */
  private transformJobDescription(data: any): JobDescriptionWithPricing {
    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt,
      tasks: data.tasks ? data.tasks.map((task: any) => ({
        ...task,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt
      })) : []
    }
  }

  /**
   * Get all job descriptions with pricing
   */
  async getAllJobDescriptions(): Promise<JobDescriptionWithPricing[]> {
    try {
      console.log('Fetching all job descriptions from API...')
      const response = await this.fetchWithTimeout(this.baseUrl)
      const data = await this.handleResponse(response)
      
      console.log(`Successfully fetched ${data.data.length} job descriptions`)
      return data.data.map((item: any) => this.transformJobDescription(item))
    } catch (error) {
      console.error('Error fetching job descriptions:', error)
      throw new Error(`Failed to fetch job descriptions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get job description by ID with pricing
   */
  async getJobDescriptionById(id: string): Promise<JobDescriptionWithPricing> {
    try {
      console.log(`Fetching job description ${id} from API...`)
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`)
      const data = await this.handleResponse(response)
      
      console.log(`Successfully fetched job description: ${data.data.title}`)
      return this.transformJobDescription(data.data)
    } catch (error) {
      console.error(`Error fetching job description ${id}:`, error)
      throw new Error(`Failed to fetch job description: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get job descriptions by job order ID
   */
  async getJobDescriptionsByJobOrderId(jobOrderId: string): Promise<JobDescriptionWithPricing[]> {
    try {
      console.log(`Fetching job descriptions for job order ${jobOrderId} from API...`)
      const response = await this.fetchWithTimeout(`${this.baseUrl}/job-order/${jobOrderId}`)
      const data = await this.handleResponse(response)
      
      console.log(`Successfully fetched ${data.data.length} job descriptions for job order ${jobOrderId}`)
      return data.data
    } catch (error) {
      console.error(`Error fetching job descriptions for job order ${jobOrderId}:`, error)
      throw new Error(`Failed to fetch job descriptions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create new job description with pricing calculation
   */
  async createJobDescription(formData: JobDescriptionFormData): Promise<JobDescriptionWithPricing> {
    try {
      console.log('Creating new job description via API...')
      console.log('Form data:', formData)
      
      const response = await this.fetchWithTimeout(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      
      const data = await this.handleResponse(response)
      
      console.log(`Successfully created job description: ${data.data.title}`)
      console.log(`Pricing - Labor: $${data.pricing.laborCost}, Parts: $${data.pricing.partsCost}, Total: $${data.pricing.totalCost}`)
      
      return data.data
    } catch (error) {
      console.error('Error creating job description:', error)
      throw new Error(`Failed to create job description: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update job description with pricing recalculation
   */
  async updateJobDescription(id: string, updateData: Partial<JobDescriptionFormData>): Promise<JobDescriptionWithPricing> {
    try {
      console.log(`Updating job description ${id} via API...`)
      console.log('Update data:', updateData)
      
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      const data = await this.handleResponse(response)
      
      console.log(`Successfully updated job description: ${data.data.title}`)
      console.log(`Updated pricing - Labor: $${data.pricing.laborCost}, Parts: $${data.pricing.partsCost}, Total: $${data.pricing.totalCost}`)
      
      return data.data
    } catch (error) {
      console.error(`Error updating job description ${id}:`, error)
      throw new Error(`Failed to update job description: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete job description
   */
  async deleteJobDescription(id: string): Promise<void> {
    try {
      console.log(`Deleting job description ${id} via API...`)
      
      const response = await this.fetchWithTimeout(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      })
      
      await this.handleResponse(response)
      
      console.log(`Successfully deleted job description: ${id}`)
    } catch (error) {
      console.error(`Error deleting job description ${id}:`, error)
      throw new Error(`Failed to delete job description: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate job description data before submission
   */
  validateJobDescriptionData(data: JobDescriptionFormData): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!data.title || data.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long'
    }

    if (!data.description || data.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long'
    }

    if (!data.estimatedHours || data.estimatedHours <= 0) {
      errors.estimatedHours = 'Estimated hours must be greater than 0'
    }

    if (!data.priority || !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.priority = 'Priority must be one of: low, medium, high, urgent'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Calculate pricing preview without saving
   */
  calculatePricingPreview(estimatedHours: number, priority: string): {
    laborCost: number
    partsCost: number
    totalCost: number
    hourlyRate: number
  } {
    const LABOR_RATES = {
      'low': 65,
      'medium': 75,
      'high': 85,
      'urgent': 95
    }

    const hourlyRate = LABOR_RATES[priority as keyof typeof LABOR_RATES] || LABOR_RATES.medium
    const laborCost = estimatedHours * hourlyRate
    const partsCost = estimatedHours * 25 // Mock calculation
    const totalCost = laborCost + partsCost

    return {
      laborCost,
      partsCost,
      totalCost,
      hourlyRate
    }
  }
}

// Create singleton instance
export const jobDescriptionApiService = new JobDescriptionApiService()

export default jobDescriptionApiService