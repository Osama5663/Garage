import { getMariaPool } from '../config/mariadb.js'
import { v4 as uuidv4 } from 'uuid'

export interface JobTask {
  id: string
  title: string
  description: string
  estimatedHours: number
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface JobDescription {
  id: string
  title: string
  description: string
  tasks: JobTask[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  laborCost: number
  partsCost: number
  totalCost: number
  jobOrderId?: string
  createdAt: string
  updatedAt: string
  order: number
  parts?: Array<{
    id: string
    name: string
    quantity: number
    unitCost: number
    totalCost: number
  }>
  labor?: Array<{
    id: string
    description: string
    hours: number
    hourlyRate: number
    totalCost: number
  }>
}

export interface JobDescriptionFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  jobOrderId?: string
  parts?: Array<{
    id?: string
    name: string
    quantity: number
    unitCost: number
  }>
  labor?: Array<{
    id?: string
    description: string
    hours: number
    hourlyRate: number
  }>
}

export interface JobDescriptionWithPricing extends JobDescription {
  calculatedLaborCost: number
  calculatedPartsCost: number
  calculatedTotalCost: number
  pricingBreakdown: {
    labor: {
      hours: number
      rate: number
      cost: number
    }
    parts: Array<{
      id: string
      name: string
      quantity: number
      unitCost: number
      totalCost: number
    }>
    totalPartsCost: number
    totalCost: number
  }
}

const LABOR_RATES = {
  low: 65,
  medium: 75,
  high: 85,
  urgent: 95
} as const

const PRIORITY_MULTIPLIERS = {
  low: 1.0,
  medium: 1.1,
  high: 1.2,
  urgent: 1.4
} as const

const TABLE = 'job_descriptions'

const ensureTable = async () => {
  const pool = await getMariaPool()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`_id\` VARCHAR(255) NOT NULL,
      \`doc\` LONGTEXT NOT NULL,
      PRIMARY KEY (\`_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  )
}

const parse = (value: any) => {
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

const listAll = async (): Promise<any[]> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\``)
  return (rows as Array<{ doc: string }>).map(r => parse(r.doc)).filter(Boolean)
}

const getById = async (id: string): Promise<any | null> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [rows] = await pool.query(`SELECT \`doc\` FROM \`${TABLE}\` WHERE \`_id\` = ? LIMIT 1`, [id])
  const arr = rows as Array<{ doc: string }>
  if (!arr.length) return null
  return parse(arr[0].doc)
}

const upsert = async (id: string, doc: any): Promise<any> => {
  await ensureTable()
  const pool = await getMariaPool()
  const payload = { ...doc, _id: id, id }
  await pool.query(
    `INSERT INTO \`${TABLE}\` (\`_id\`, \`doc\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`doc\`=VALUES(\`doc\`)`,
    [id, JSON.stringify(payload)]
  )
  return payload
}

const remove = async (id: string): Promise<boolean> => {
  await ensureTable()
  const pool = await getMariaPool()
  const [res] = await pool.query(`DELETE FROM \`${TABLE}\` WHERE \`_id\` = ?`, [id])
  const info = res as any
  return !!(info.affectedRows > 0)
}

export class JobDescriptionService {
  private calculateLaborCost(hours: number, priority: string): number {
    const baseRate = LABOR_RATES[priority as keyof typeof LABOR_RATES] || LABOR_RATES.medium
    const multiplier = PRIORITY_MULTIPLIERS[priority as keyof typeof PRIORITY_MULTIPLIERS] || 1.0
    return hours * baseRate * multiplier
  }

  private buildWithPricing(description: JobDescription): JobDescriptionWithPricing {
    const laborCost = description.laborCost
    const partsCost = description.partsCost
    const totalCost = description.totalCost

    return {
      ...description,
      calculatedLaborCost: laborCost,
      calculatedPartsCost: partsCost,
      calculatedTotalCost: totalCost,
      pricingBreakdown: {
        labor: {
          hours: description.estimatedHours,
          rate: LABOR_RATES[description.priority as keyof typeof LABOR_RATES],
          cost: laborCost,
        },
        parts: (description.parts && description.parts.length > 0)
          ? description.parts
          : [
              {
                id: 'mock_part_1',
                name: 'Standard Parts Kit',
                quantity: 1,
                unitCost: partsCost,
                totalCost: partsCost,
              },
            ],
        totalPartsCost: partsCost,
        totalCost: totalCost,
      },
    }
  }

  private validateJobDescription(data: JobDescriptionFormData): { isValid: boolean; errors: Record<string, string> } {
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

  async getAllJobDescriptions(): Promise<JobDescriptionWithPricing[]> {
    const docs = await listAll()
    docs.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    return docs.map((d) => this.buildWithPricing(d as JobDescription))
  }

  async getJobDescriptionById(id: string): Promise<JobDescriptionWithPricing | null> {
    const doc = await getById(id)
    if (!doc) return null
    return this.buildWithPricing(doc as JobDescription)
  }

  async getJobDescriptionsByJobOrderId(jobOrderId: string): Promise<JobDescriptionWithPricing[]> {
    const docs = (await listAll()).filter(d => String(d.jobOrderId || '') === String(jobOrderId))
    docs.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    return docs.map((d) => this.buildWithPricing(d as JobDescription))
  }

  async createJobDescription(data: JobDescriptionFormData): Promise<JobDescriptionWithPricing> {
    const validation = this.validateJobDescription(data)
    if (!validation.isValid) {
      throw new Error(`Validation failed:${JSON.stringify(validation.errors)}`)
    }

    const all = await listAll()
    const maxOrder = all.reduce((m, d) => Math.max(m, Number(d.order || 0)), 0)
    const now = new Date().toISOString()
    const id = uuidv4()

    const parts = (data.parts || []).map(p => ({
      id: p.id || uuidv4(),
      name: p.name,
      quantity: p.quantity,
      unitCost: p.unitCost,
      totalCost: Number(p.quantity || 0) * Number(p.unitCost || 0),
    }))
    const labor = (data.labor || []).map(l => ({
      id: l.id || uuidv4(),
      description: l.description,
      hours: l.hours,
      hourlyRate: l.hourlyRate,
      totalCost: Number(l.hours || 0) * Number(l.hourlyRate || 0),
    }))

    const partsCost = parts.reduce((sum: number, p: any) => sum + Number(p.totalCost || 0), 0)
    const laborCost = this.calculateLaborCost(Number(data.estimatedHours || 0), data.priority)
    const totalCost = partsCost + laborCost

    const doc: JobDescription = {
      id,
      title: data.title,
      description: data.description,
      tasks: [],
      priority: data.priority,
      estimatedHours: data.estimatedHours,
      laborCost,
      partsCost,
      totalCost,
      jobOrderId: data.jobOrderId,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
      parts,
      labor,
    }

    const saved = await upsert(id, doc)
    return this.buildWithPricing(saved as JobDescription)
  }

  async updateJobDescription(id: string, updateData: Partial<JobDescriptionFormData>): Promise<JobDescriptionWithPricing> {
    const existing = await getById(id)
    if (!existing) {
      throw new Error(`Job description not found: ${id}`)
    }

    const merged: any = { ...existing, ...updateData }

    if (updateData.title !== undefined || updateData.description !== undefined || updateData.priority !== undefined || updateData.estimatedHours !== undefined) {
      const validation = this.validateJobDescription({
        title: merged.title,
        description: merged.description,
        priority: merged.priority,
        estimatedHours: merged.estimatedHours,
        jobOrderId: merged.jobOrderId,
        parts: merged.parts,
        labor: merged.labor,
      } as JobDescriptionFormData)
      if (!validation.isValid) {
        throw new Error(`Validation failed:${JSON.stringify(validation.errors)}`)
      }
    }

    const parts = updateData.parts
      ? updateData.parts.map(p => ({
          id: p.id || uuidv4(),
          name: p.name,
          quantity: p.quantity,
          unitCost: p.unitCost,
          totalCost: Number(p.quantity || 0) * Number(p.unitCost || 0),
        }))
      : merged.parts

    const labor = updateData.labor
      ? updateData.labor.map(l => ({
          id: l.id || uuidv4(),
          description: l.description,
          hours: l.hours,
          hourlyRate: l.hourlyRate,
          totalCost: Number(l.hours || 0) * Number(l.hourlyRate || 0),
        }))
      : merged.labor

    const partsCost = (Array.isArray(parts) ? parts : []).reduce((sum: number, p: any) => sum + Number(p.totalCost || 0), 0)
    const laborCost = this.calculateLaborCost(Number(merged.estimatedHours || 0), String(merged.priority || 'medium'))
    const totalCost = partsCost + laborCost

    const now = new Date().toISOString()
    const updated: JobDescription = {
      ...merged,
      id,
      parts,
      labor,
      partsCost,
      laborCost,
      totalCost,
      updatedAt: now,
    } as JobDescription

    const saved = await upsert(id, updated)
    return this.buildWithPricing(saved as JobDescription)
  }

  async deleteJobDescription(id: string): Promise<boolean> {
    return await remove(id)
  }
}

export const jobDescriptionService = new JobDescriptionService()

