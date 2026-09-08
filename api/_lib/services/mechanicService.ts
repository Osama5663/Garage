import {
  createMechanicMaria,
  deleteMechanicMaria,
  getMechanicByIdMaria,
  listMechanicsMaria,
  updateMechanicMaria,
} from '../repositories/mechanicsRepo.js'

export type Mechanic = {
  id: string
  name: string
  specialization: string
  phone: string
  status: string
  hourlyRate: number
}

export type MechanicCreateData = Omit<Mechanic, 'id'> & { id?: string }
export type MechanicUpdateData = Partial<MechanicCreateData>

const sanitize = (val: string): string => val.trim()

export class MechanicService {
  async list(): Promise<Mechanic[]> {
    const docs = await listMechanicsMaria()
    return docs.map((d: any) => ({
      id: String(d.id || d._id || ''),
      name: d.name,
      specialization: d.specialization,
      phone: d.phone,
      status: d.status,
      hourlyRate: d.hourlyRate,
    })) as Mechanic[]
  }

  async getById(id: string): Promise<Mechanic | null> {
    const d: any = await getMechanicByIdMaria(id)
    if (!d) return null
    return {
      id: String(d.id || id),
      name: d.name,
      specialization: d.specialization,
      phone: d.phone,
      status: d.status,
      hourlyRate: d.hourlyRate,
    } as Mechanic
  }

  async create(data: MechanicCreateData): Promise<Mechanic> {
    if (!data.name || !data.specialization || !data.phone) {
      throw new Error('Name, specialization and phone are required')
    }
    if (data.hourlyRate === undefined || data.hourlyRate === null) {
      throw new Error('Hourly rate is required')
    }

    const created = await createMechanicMaria({
      name: sanitize(data.name),
      specialization: sanitize(data.specialization),
      phone: sanitize(data.phone),
      status: data.status ?? 'active',
      hourlyRate: data.hourlyRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return {
      id: String(created.id),
      name: created.name,
      specialization: created.specialization,
      phone: created.phone,
      status: created.status,
      hourlyRate: created.hourlyRate,
    } as Mechanic
  }

  async update(id: string, data: MechanicUpdateData): Promise<Mechanic | null> {
    const existing: any = await getMechanicByIdMaria(id)
    if (!existing) return null
    const updated: any = {
      ...existing,
      ...(data.name !== undefined ? { name: sanitize(data.name) } : {}),
      ...(data.specialization !== undefined ? { specialization: sanitize(data.specialization) } : {}),
      ...(data.phone !== undefined ? { phone: sanitize(data.phone) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate } : {}),
      updatedAt: new Date().toISOString(),
    }
    const saved = await updateMechanicMaria(id, updated)
    return {
      id: String(saved.id || id),
      name: saved.name,
      specialization: saved.specialization,
      phone: saved.phone,
      status: saved.status,
      hourlyRate: saved.hourlyRate,
    } as Mechanic
  }

  async delete(id: string): Promise<boolean> {
    return await deleteMechanicMaria(id)
  }
}

export const mechanicService = new MechanicService()
