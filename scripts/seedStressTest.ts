const API_BASE = process.env.API_BASE || 'http://localhost:8082/api'
const USER_ID = process.env.USER_ID || '1'
const COUNT = Number(process.env.COUNT || '100')
const SEED_TAG = process.env.SEED_TAG || `stress_${Date.now()}`

type Persisted<T> = { state: T; version: number }

const makeToken = (userId: string) =>
  Buffer.from(`${userId}-${Date.now()}-${Math.random()}`).toString('base64')

const headers = {
  Authorization: `Bearer ${makeToken(USER_ID)}`,
  'Content-Type': 'application/json',
}

const isoDate = (d: Date) => d.toISOString().split('T')[0]

const addDays = (base: Date, days: number) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

const getStateValue = async (key: string): Promise<string | null> => {
  const res = await fetch(`${API_BASE}/state/${encodeURIComponent(key)}`, {
    method: 'GET',
    headers,
  })
  const json = (await res.json()) as any
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Failed to read state for ${key}`)
  }
  return json.data ?? null
}

const putStateValue = async (key: string, value: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ value }),
  })
  const json = (await res.json()) as any
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Failed to write state for ${key}`)
  }
}

const parsePersisted = <T>(raw: string | null, fallbackState: T): Persisted<T> => {
  if (!raw) return { state: fallbackState, version: 1 }
  try {
    const parsed = JSON.parse(raw) as Persisted<T>
    if (parsed && typeof parsed === 'object' && (parsed as any).state) {
      return { state: parsed.state, version: typeof parsed.version === 'number' ? parsed.version : 1 }
    }
  } catch {}
  return { state: fallbackState, version: 1 }
}

const stringifyPersisted = <T>(p: Persisted<T>) => JSON.stringify({ state: p.state, version: p.version })

const main = async () => {
  const now = new Date()
  const today = isoDate(now)
  const deadline = isoDate(addDays(now, 7))
  const expiry = isoDate(addDays(now, 15))
  const due = isoDate(addDays(now, 30))
  const year = new Date().getFullYear()

  const [customersRaw, jobsRaw, estInvRaw] = await Promise.all([
    getStateValue('garage-customers-storage'),
    getStateValue('job-order-storage'),
    getStateValue('garage-estimates-invoices-storage'),
  ])

  const customersPersisted = parsePersisted<any>(
    customersRaw,
    { customers: [], searchTerm: '', selectedCustomer: null, isLoading: false },
  )
  const jobOrdersPersisted = parsePersisted<any>(
    jobsRaw,
    { jobOrders: [], searchTerm: '', selectedJobOrder: null, deletionMeta: {} },
  )
  const estInvPersisted = parsePersisted<any>(
    estInvRaw,
    { estimates: [], invoices: [], paymentRecords: [], invoiceDeliveryLinks: {}, isCreatingEstimate: false, isCreatingInvoice: false, selectedEstimate: null, selectedInvoice: null },
  )

  const existingCustomers = Array.isArray(customersPersisted.state.customers) ? customersPersisted.state.customers : []
  const existingJobs = Array.isArray(jobOrdersPersisted.state.jobOrders) ? jobOrdersPersisted.state.jobOrders : []
  const existingEstimates = Array.isArray(estInvPersisted.state.estimates) ? estInvPersisted.state.estimates : []
  const existingInvoices = Array.isArray(estInvPersisted.state.invoices) ? estInvPersisted.state.invoices : []

  const baseEstimateSeq = existingEstimates.length + 1
  const baseInvoiceSeq = existingInvoices.length + 1
  const baseJobSeq = existingJobs.length + 1

  const newCustomers: any[] = []
  const newJobs: any[] = []
  const newEstimates: any[] = []
  const newInvoices: any[] = []

  for (let i = 0; i < COUNT; i += 1) {
    const customerId = `cust_${SEED_TAG}_${i}`
    const vehicleId = `v_${SEED_TAG}_${i}`
    const jobId = `job_${SEED_TAG}_${i}`
    const estimateId = `est_${SEED_TAG}_${i}`
    const invoiceId = `inv_${SEED_TAG}_${i}`

    const firstName = `Test${i}`
    const lastName = `Client${i}`
    const customerName = `${firstName} ${lastName}`
    const registration = `ST-${String(i + 1).padStart(3, '0')}-${String(Date.now()).slice(-4)}`
    const vin = `STRESSVIN${String(i + 1).padStart(6, '0')}${String(Date.now()).slice(-6)}`

    const customer = {
      id: customerId,
      type: 'individual',
      firstName,
      lastName,
      email: `stress_${SEED_TAG}_${i}@example.com`,
      phone: `0600000${String(i).padStart(3, '0')}`,
      address: { street: '1 Test Street', city: 'Marrakech', state: 'Marrakech', zipCode: '40000' },
      loyaltyCardNumber: '',
      notes: 'Stress test seed',
      vehicles: [
        {
          id: vehicleId,
          make: 'Honda',
          model: 'Civic',
          year: 2019,
          vin,
          registration,
          color: 'Black',
          mileage: 10000 + i,
          serviceHistory: [],
          invoices: [],
        }
      ],
      totalSpent: 0,
      registrationDate: today,
    }

    const itemPrice = 100 + (i % 50)
    const taxRate = 20
    const vatAmount = itemPrice * (taxRate / 100)

    const estimateNumber = `DV-${year}-${String(baseEstimateSeq + i).padStart(3, '0')}`
    const invoiceNumber = `FA-${year}-${String(baseInvoiceSeq + i).padStart(3, '0')}`
    const jobNumber = `OR-${year}-${String(baseJobSeq + i).padStart(4, '0')}`

    const estimateItem = {
      id: `est_item_${SEED_TAG}_${i}`,
      type: 'service',
      description: 'Contrôle et diagnostic (stress test)',
      quantity: 1,
      unitPrice: itemPrice,
      totalPrice: itemPrice,
      taxRate,
    }

    const invoiceItem = {
      id: `inv_item_${SEED_TAG}_${i}`,
      type: 'service',
      description: 'Contrôle et diagnostic (stress test)',
      quantity: 1,
      unitPrice: itemPrice,
      totalPrice: itemPrice,
      taxRate,
    }

    const estimate = {
      id: estimateId,
      estimateNumber,
      customerId,
      customerName,
      vehicleId,
      vehicleInfo: { make: 'Honda', model: 'Civic', year: 2019, vin, registration },
      issueDate: today,
      expiryDate: expiry,
      status: 'draft',
      items: [estimateItem],
      subtotal: itemPrice,
      vatAmount,
      totalAmount: itemPrice + vatAmount,
      notes: 'Stress test seed',
      termsAndConditions: 'Test only.',
      convertedToInvoice: invoiceId,
      convertedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'stress_test',
    }

    const invoiceTotal = itemPrice + vatAmount

    const invoice = {
      id: invoiceId,
      invoiceNumber,
      estimateId,
      customerId,
      customerName,
      vehicleId,
      vehicleInfo: { make: 'Honda', model: 'Civic', year: 2019, vin, registration },
      issueDate: today,
      dueDate: due,
      status: 'draft',
      items: [invoiceItem],
      subtotal: itemPrice,
      vatAmount,
      totalAmount: invoiceTotal,
      paidAmount: 0,
      remainingAmount: invoiceTotal,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: 'Stress test seed',
      termsAndConditions: 'Test only.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'stress_test',
    }

    const jobOrder = {
      id: jobId,
      jobNumber,
      customerId,
      vehicleId,
      customerName,
      vehicleInfo: { make: 'Honda', model: 'Civic', year: 2019, vin, registration },
      description: 'Stress test job order',
      jobDescriptions: [],
      priority: 'medium',
      status: 'pending',
      assignedMechanic: '',
      estimatedHours: 1,
      actualHours: 0,
      startDate: today,
      deadline,
      partsUsed: [],
      laborItems: [],
      diagnosticFiles: [],
      attachedImages: [],
      estimatedCost: invoiceTotal,
      finalCost: invoiceTotal,
      invoiceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'stress_test',
      notes: 'Stress test seed',
      isApproved: false,
    }

    newCustomers.push(customer)
    newJobs.push(jobOrder)
    newEstimates.push(estimate)
    newInvoices.push(invoice)
  }

  customersPersisted.state.customers = [...existingCustomers, ...newCustomers]
  jobOrdersPersisted.state.jobOrders = [...existingJobs, ...newJobs]
  estInvPersisted.state.estimates = [...existingEstimates, ...newEstimates]
  estInvPersisted.state.invoices = [...existingInvoices, ...newInvoices]

  await Promise.all([
    putStateValue('garage-customers-storage', stringifyPersisted(customersPersisted)),
    putStateValue('job-order-storage', stringifyPersisted(jobOrdersPersisted)),
    putStateValue('garage-estimates-invoices-storage', stringifyPersisted(estInvPersisted)),
  ])

  console.log(
    JSON.stringify(
      {
        userId: USER_ID,
        created: COUNT,
        customers: { before: existingCustomers.length, after: customersPersisted.state.customers.length },
        jobOrders: { before: existingJobs.length, after: jobOrdersPersisted.state.jobOrders.length },
        estimates: { before: existingEstimates.length, after: estInvPersisted.state.estimates.length },
        invoices: { before: existingInvoices.length, after: estInvPersisted.state.invoices.length },
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

