import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useCustomerStore } from '../stores/customerStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useCashflowStore } from '../stores/cashflowStore'
import { useAuthStore, useHasPermission, useHasRole } from '../stores/authStore'
import { JobOrder, JobPart, LaborItem, JobImage, VehicleInspection, InspectionStatus, VehicleCheckSheet } from '../types/jobOrder'
import { InventoryItem } from '../types/inventory'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Wrench, 
  FileText,
  Plus,
  Camera,
  Eye,
  Upload,
  CheckCircle,
  AlertTriangle,
  Package,
  Search,
  X,
  CheckSquare,
  Trash,
  Printer,
  Pencil,
  Edit,
  RefreshCcw,
  LogIn,
  LogOut
} from 'lucide-react'
import { useWorkshopSettings } from '../stores/settingsStore'
import { DiagnosticReportUpload } from '../components/DiagnosticReportUpload'
import { printJobOrder } from '../utils/jobOrderPrint'
import { formatCurrency } from '../utils/formatters'
import { useSystemTime } from '../stores/timeStore'
import { PrintableBonDeSortie } from '../components/PrintableBonDeSortie'
import { PrintableVehicleInspection } from '../components/PrintableVehicleInspection'
import { PrintableVehicleCheckSheet } from '../components/PrintableVehicleCheckSheet'

const JobOrderDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getVisibleJobOrders, addPartToJob, addLaborToJob, addImageToJob, deleteImageFromJob, updateJobStatus, updateJobOrder, approveJobOrder, isJobOrderReadyForApproval, markJobOrderAsTransferred } = useJobOrderStore()
  const { mechanics, fetchMechanics } = useMechanicStore()
  const { createDeliveryNote, deliveryNotes, syncDeliveryNoteFromJobOrder } = useDeliveryNoteStore()
  const { inventoryItems, adjustStock } = useInventoryStore()
  const { customers } = useCustomerStore()
  const { invoices } = useEstimateInvoiceStore()
  const cashflowMovements = useCashflowStore((state) => state.movements)
  const workshop = useWorkshopSettings()
  
  const jobOrder = getVisibleJobOrders().find(job => job.id === id)
  const { currentUser } = useAuthStore()
  const canApproveJobOrders = useHasPermission('APPROVE', 'job-orders')
  const canViewPrices = useHasRole(['admin','supervisor','cashier'])
  const canUpdate = useHasPermission('update', 'job-orders')

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    description: '',
    priority: 'medium',
    assignedMechanic: '',
    deadline: ''
  })
  
  const [sp] = useSearchParams()
  const [showLinkEstimateModal, setShowLinkEstimateModal] = useState(false)

  const handleLinkEstimate = (estimateId: string, jobOrderId: string) => {
    useEstimateInvoiceStore.getState().linkEstimateToJobOrder(estimateId, jobOrderId);
    useJobOrderStore.getState().addLinkedEstimate(jobOrderId, estimateId);
  };
  
  const handleUnlinkEstimate = (estimateId: string, jobOrderId: string) => {
    useEstimateInvoiceStore.getState().unlinkEstimateFromJobOrder(estimateId);
    useJobOrderStore.getState().removeLinkedEstimate(jobOrderId, estimateId);
  };

  useEffect(() => {
    if (sp.get('action') === 'edit') {
      setShowEditModal(true)
    }
  }, [sp])
  
  useEffect(() => {
    if (showEditModal && jobOrder) {
      setEditFormData({
        description: jobOrder.description || '',
        priority: jobOrder.priority || 'medium',
        assignedMechanic: jobOrder.assignedMechanic || '',
        deadline: jobOrder.deadline || ''
      })
    }
  }, [showEditModal, jobOrder])

  useEffect(() => {
    fetchMechanics()
  }, [fetchMechanics])

  const handleUpdateJobOrder = () => {
    if (!jobOrder) return
    updateJobOrder(jobOrder.id, {
      description: editFormData.description,
      priority: editFormData.priority as any,
      ...(currentUser?.role === 'mechanic'
        ? {}
        : { assignedMechanic: editFormData.assignedMechanic }),
      deadline: editFormData.deadline
    })
    setShowEditModal(false)
  }

  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [newStatus, setNewStatus] = useState<JobOrder['status']>('pending')
  const [statusNotes, setStatusNotes] = useState('')
  
  const initialTab = (() => {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      return (sp.get('tab') || 'overview') as 'overview' | 'inspection' | 'check_in' | 'check_out' | 'parts' | 'labor' | 'diagnostics' | 'images' | 'documents'
    } catch { return 'overview' }
  })()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'inspection' | 'check_in' | 'check_out' | 'parts' | 'labor' | 'diagnostics' | 'images' | 'documents'>(initialTab)
  const [showInventoryPicker, setShowInventoryPicker] = useState(false)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [selectedMechanic, setSelectedMechanic] = useState('')
  const [taskHours, setTaskHours] = useState('')
  
  // Edit state variables
  const [editingLabor, setEditingLabor] = useState<string | null>(null)
  const [editingPart, setEditingPart] = useState<string | null>(null)
  const [editLaborData, setEditLaborData] = useState({
    description: '',
    mechanic: '',
    hours: 0,
    rate: 0
  })
  const [editPartData, setEditPartData] = useState<{
    quantity: number
    unitCost: number
    status: JobPart['status']
  }>({
    quantity: 1,
    unitCost: 0,
    status: 'ordered'
  })
  const [isPrintingExitDocument, setIsPrintingExitDocument] = useState(false)
  const [isPrintingInspection, setIsPrintingInspection] = useState(false)
  const [isPrintingCheckIn, setIsPrintingCheckIn] = useState(false)
  const [isPrintingCheckOut, setIsPrintingCheckOut] = useState(false)
  
  const handlePrint = async (withPrice: boolean) => {
    if (!jobOrder) return
    try {
      const customer = customers.find(c => c.id === jobOrder.customerId)
      const effectiveWithPrice = withPrice && canViewPrices
      await printJobOrder(jobOrder, customer, workshop || null, effectiveWithPrice)
    } catch (error) {
      console.error('Failed to print job order:', error)
      alert('Failed to generate print document. Please try again.')
    }
  }

  const mechanic = jobOrder ? mechanics.find(m => m.id === jobOrder.assignedMechanic) : undefined
  const { now } = useSystemTime()
  const isOverdue = jobOrder ? new Date(jobOrder.deadline) < now && jobOrder.status !== 'completed' : false

  const vehicleExpenses = useMemo(() => {
    if (!jobOrder) return []
    return cashflowMovements.filter(m => m.type === 'outflow' && m.vehicleId === jobOrder.vehicleId)
  }, [cashflowMovements, jobOrder])

  const vehicleEntries = useMemo(() => {
    if (!jobOrder) return []
    return cashflowMovements.filter(m => m.type === 'inflow' && m.vehicleId === jobOrder.vehicleId)
  }, [cashflowMovements, jobOrder])

  const vehicleExpenseTotal = useMemo(() => {
    return vehicleExpenses.reduce((sum, m) => sum + m.amount, 0)
  }, [vehicleExpenses])

  const vehicleEntryTotal = useMemo(() => {
    return vehicleEntries.reduce((sum, m) => sum + m.amount, 0)
  }, [vehicleEntries])

  const partsSellTotal = useMemo(() => {
    if (!jobOrder) return 0
    return (jobOrder.partsUsed || []).reduce((sum, part) => {
      const qty = part.quantity || 0
      const unit = part.unitCost || 0
      const total = part.totalCost || (qty * unit)
      return sum + total
    }, 0)
  }, [jobOrder])

  const partsBuyTotal = useMemo(() => {
    if (!jobOrder) return 0
    return (jobOrder.partsUsed || []).reduce((sum, part) => {
      const key = (part.partNumber || '').trim()
      const bySku = key
        ? inventoryItems.find(item => item.sku === key || item.manufacturerPartNumber === key || item.supplierPartNumber === key)
        : undefined
      const byName = inventoryItems.find(item => item.name.toLowerCase() === part.name.toLowerCase())
      const unitCost = (bySku || byName)?.unitCost ?? (part.unitCost || 0)
      return sum + ((part.quantity || 0) * unitCost)
    }, 0)
  }, [jobOrder, inventoryItems])

  const laborSellTotal = useMemo(() => {
    if (!jobOrder) return 0
    return (jobOrder.laborItems || []).reduce((sum, item) => sum + (item.total || 0), 0)
  }, [jobOrder])

  const laborHoursTotal = useMemo(() => {
    if (!jobOrder) return 0
    return (jobOrder.laborItems || []).reduce((sum, item) => sum + (item.hours || 0), 0)
  }, [jobOrder])

  const revenueTotal = partsSellTotal + laborSellTotal
  const benefitTotal = revenueTotal - partsBuyTotal - vehicleExpenseTotal
  const benefitClass = benefitTotal >= 0 ? 'text-green-600' : 'text-red-600'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'waiting-parts': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'approved': return 'bg-purple-100 text-purple-800'
      case 'transferred': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-100 border-green-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const handlePrintExitDocument = () => {
    if (!jobOrder || jobOrder.status !== 'completed') return
    setIsPrintingExitDocument(true)
    setTimeout(() => {
      window.print()
      setIsPrintingExitDocument(false)
    }, 500)
  }

  const handlePrintInspection = () => {
    if (!jobOrder) return
    setIsPrintingInspection(true)
    setTimeout(() => {
      window.print()
      setIsPrintingInspection(false)
    }, 500)
  }

  const handlePrintCheckIn = () => {
    if (!jobOrder) return
    setIsPrintingCheckIn(true)
    setTimeout(() => {
      window.print()
      setIsPrintingCheckIn(false)
    }, 500)
  }

  const handlePrintCheckOut = () => {
    if (!jobOrder) return
    setIsPrintingCheckOut(true)
    setTimeout(() => {
      window.print()
      setIsPrintingCheckOut(false)
    }, 500)
  }

  const createDefaultInspection = (): VehicleInspection => {
    const job = jobOrder!
    const nowIso = new Date().toISOString()
    return {
      id: `insp_${job.id}`,
      jobOrderId: job.id,
      vehicleId: job.vehicleId,
      date: nowIso,
      sections: [
        {
          id: 'pneumatic',
          label: 'Pneumatique',
          items: [
            { id: 'front_left_tire', label: 'Pneu avant gauche', status: null },
            { id: 'front_right_tire', label: 'Pneu avant droit', status: null },
            { id: 'rear_left_tire', label: 'Pneu arrière gauche', status: null },
            { id: 'rear_right_tire', label: 'Pneu arrière droit', status: null },
            { id: 'spare_wheel', label: 'Roue de secours', status: null }
          ]
        },
        {
          id: 'underbody',
          label: 'Sous-caisse',
          items: [
            { id: 'engine_leaks', label: 'Trace de fuites Moteur', status: null },
            { id: 'gearbox_leaks', label: 'Trace de fuites Boite', status: null },
            { id: 'steering_leaks', label: 'Trace de fuites Direction Assistée', status: null },
            { id: 'cooling_leaks', label: 'Trace de fuites Refroidissement', status: null },
            { id: 'brake_leaks', label: 'Trace de fuites freins', status: null },
            { id: 'driveshaft_boots', label: 'Soufflets de transmission et direction', status: null },
            { id: 'wheel_bearings', label: 'Roulements de moyeux de roues', status: null },
            { id: 'exhaust_line', label: 'Ligne d’échappement', status: null }
          ]
        },
        {
          id: 'suspension',
          label: 'Suspension',
          items: [
            { id: 'front_shocks', label: 'Amortisseurs AV', status: null },
            { id: 'rear_shocks', label: 'Amortisseurs ARR', status: null },
            { id: 'front_springs', label: 'Ressorts AV', status: null },
            { id: 'rear_springs', label: 'Ressorts ARR', status: null },
            { id: 'front_silentblocks', label: 'Silents blocs AV', status: null },
            { id: 'rear_silentblocks', label: 'Silents blocs ARR', status: null }
          ]
        },
        {
          id: 'braking',
          label: 'Freinage',
          items: [
            { id: 'front_discs', label: 'Disques de frein AV', status: null },
            { id: 'rear_discs', label: 'Disques de frein ARR', status: null },
            { id: 'front_pads', label: 'Plaquettes de frein AV', status: null },
            { id: 'rear_pads', label: 'Plaquettes de frein ARR', status: null },
            { id: 'front_tightness', label: 'Etanchéité circuit de freinage AV', status: null },
            { id: 'rear_tightness', label: 'Etanchéité circuit de freinage ARR', status: null }
          ]
        },
        {
          id: 'under_hood',
          label: 'Sous capot',
          items: [
            { id: 'battery', label: 'Batterie', status: null },
            { id: 'battery_charge', label: 'Charge batterie (alternateur)', status: null },
            { id: 'belts', label: 'Courroie accessoires', status: null },
            { id: 'air_filter', label: 'Filtre à air', status: null },
            { id: 'coolant_level', label: 'Niveau liquide de refroidissement', status: null },
            { id: 'brake_fluid', label: 'Niveau liquide de frein', status: null },
            { id: 'oil_level', label: 'Niveau huile moteur', status: null }
          ]
        },
        {
          id: 'interior',
          label: 'Habitacle',
          items: [
            { id: 'dashboard_warning', label: 'Voyant tableau de bord', status: null },
            { id: 'interior_lights', label: 'Eclairage plafonnier - Boîte à gants', status: null },
            { id: 'wiper_operation', label: 'Fonctionnement essuie-glace', status: null },
            { id: 'washers', label: 'Gicleurs lave-glace', status: null },
            { id: 'horn', label: 'Klaxon', status: null },
            { id: 'ventilation', label: 'Ventilation', status: null },
            { id: 'cabin_filter', label: 'Filtre habitacle', status: null },
            { id: 'ac_operation', label: 'Fonctionnement climatisation', status: null },
            { id: 'radio', label: 'Radio', status: null }
          ]
        },
        {
          id: 'front',
          label: 'Avant',
          items: [
            { id: 'front_wipers', label: 'Balais essuie-glace', status: null },
            { id: 'windscreen', label: 'Pare-brise', status: null },
            { id: 'front_plate', label: 'Plaque immatriculation', status: null },
            { id: 'headlights', label: 'Phares', status: null },
            { id: 'front_indicators', label: 'Clignotants', status: null },
            { id: 'body_corrosion_front', label: 'Corrosion carrosserie', status: null }
          ]
        },
        {
          id: 'rear',
          label: 'Arrière',
          items: [
            { id: 'rear_wiper', label: 'Balai essuie-glace', status: null },
            { id: 'rear_plate', label: 'Plaque immatriculation', status: null },
            { id: 'boot_light', label: 'Eclairage du coffre', status: null },
            { id: 'rear_lights', label: 'Feux AR', status: null },
            { id: 'rear_indicators', label: 'Clignotants', status: null },
            { id: 'body_corrosion_rear', label: 'Corrosion carrosserie', status: null }
          ]
        },
        {
          id: 'sides',
          label: 'Coté',
          items: [
            { id: 'door_lights', label: 'Eclairage porte AV/ARR', status: null },
            { id: 'door_noise', label: 'Bruit ouverture portes', status: null },
            { id: 'mirrors', label: 'Rétroviseurs', status: null },
            { id: 'body_corrosion_sides', label: 'Corrosion carrosserie', status: null }
          ]
        }
      ]
    }
  }

  const [inspection, setInspection] = useState<VehicleInspection | null>(null)
  const [inspectionMileage, setInspectionMileage] = useState<string>('')
  const [inspectionInspector, setInspectionInspector] = useState<string>('')
  const [inspectionGlobalRemarks, setInspectionGlobalRemarks] = useState<string>('')

  const handleInspectionStatusChange = (sectionId: string, itemId: string, status: InspectionStatus) => {
    setInspection(prev => {
      const base = prev || createDefaultInspection()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item =>
                  item.id === itemId ? { ...item, status } : item
                )
              }
            : section
        )
      }
    })
  }

  const handleInspectionCommentChange = (sectionId: string, itemId: string, comment: string) => {
    setInspection(prev => {
      const base = prev || createDefaultInspection()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item =>
                  item.id === itemId ? { ...item, comment } : item
                )
              }
            : section
        )
      }
    })
  }

  const handleInspectionEvidenceUpload = (
    sectionId: string,
    itemId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') return
        const image: JobImage = {
          id: `insp_${Date.now()}_${file.name}`,
          url: result,
          filename: file.name,
          description: '',
          uploadDate: new Date().toISOString().split('T')[0],
          category: 'other'
        }
        setInspection(prev => {
          const base = prev || createDefaultInspection()
          return {
            ...base,
            sections: base.sections.map(section =>
              section.id === sectionId
                ? {
                    ...section,
                    items: section.items.map(item => {
                      if (item.id !== itemId) return item
                      const existing = item.evidenceImages || []
                      return { ...item, evidenceImages: [...existing, image] }
                    })
                  }
                : section
            )
          }
        })
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }

  const handleInspectionEvidenceDelete = (
    sectionId: string,
    itemId: string,
    imageId: string
  ) => {
    setInspection(prev => {
      const base = prev || createDefaultInspection()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item => {
                  if (item.id !== itemId) return item
                  const next = (item.evidenceImages || []).filter(img => img.id !== imageId)
                  return { ...item, evidenceImages: next.length ? next : undefined }
                })
              }
            : section
        )
      }
    })
  }

  const handleInspectionSave = () => {
    const base = inspection || createDefaultInspection()
    const mileageNumber = inspectionMileage ? Number(inspectionMileage) : undefined
    updateJobOrder(jobOrder.id, {
      inspection: {
        ...base,
        mileage: mileageNumber,
        inspectorName: inspectionInspector || undefined,
        globalRemarks: inspectionGlobalRemarks || undefined
      }
    })
  }

  const createDefaultCheckInSheet = (): VehicleCheckSheet => {
    const job = jobOrder!
    const nowIso = new Date().toISOString()
    return {
      id: `checkin_${job.id}`,
      jobOrderId: job.id,
      vehicleId: job.vehicleId,
      type: 'in',
      date: nowIso,
      make: job.vehicleInfo.make,
      model: job.vehicleInfo.model,
      registration: job.vehicleInfo.registration,
      vin: job.vehicleInfo.vin,
      sections: [
        {
          id: 'dossier',
          label: 'Check Dossier',
          items: [
            { id: 'ordre_reparation_signee', label: 'Ordre de réparation signée', checked: false },
            { id: 'carte_grise', label: 'Carte grise / Copie dossier', checked: false },
            { id: 'assurance', label: 'Assurance', checked: false },
            { id: 'controle_technique', label: 'Contrôle technique', checked: false },
            { id: 'vignette_annee', label: 'Vignette année en cours', checked: false },
          ],
        },
        {
          id: 'vehicule',
          label: 'Check Véhicule',
          items: [
            { id: 'photos_entree', label: 'Prise de photos entrée', checked: false },
            { id: 'housse_siege', label: 'Housse siège', checked: false },
            { id: 'housse_volant', label: 'Housse volant', checked: false },
            { id: 'housse_bva', label: 'Housse BVA', checked: false },
            { id: 'cle_etiquette', label: 'Clé avec étiquette', checked: false },
            { id: 'diag_entree', label: 'DIAG entrée', checked: false },
            { id: 'fiche_controle_systematique', label: 'Fiche contrôle systématique', checked: false },
            { id: 'fiche_check_complet', label: 'Fiche check complet dans la voiture', checked: false },
            { id: 'fiche_atelier', label: 'Fiche atelier', checked: false },
          ],
        },
      ],
    }
  }

  const createDefaultCheckOutSheet = (): VehicleCheckSheet => {
    const job = jobOrder!
    const nowIso = new Date().toISOString()
    return {
      id: `checkout_${job.id}`,
      jobOrderId: job.id,
      vehicleId: job.vehicleId,
      type: 'out',
      date: nowIso,
      make: job.vehicleInfo.make,
      model: job.vehicleInfo.model,
      registration: job.vehicleInfo.registration,
      vin: job.vehicleInfo.vin,
      sections: [
        {
          id: 'precheck_sortie',
          label: 'Pré-check Sortie Véhicule',
          items: [
            { id: 'huile_moteur', label: 'Check niveaux (visuel) huile moteur', checked: false },
            { id: 'liquide_refroidissement', label: 'Check niveaux (visuel) liquide de refroidissement', checked: false },
            { id: 'liquide_lave_glace', label: 'Check niveaux (visuel) liquide lave glace', checked: false },
            { id: 'huile_direction', label: 'Check niveaux (visuel) huile direction', checked: false },
            { id: 'liquide_frein', label: 'Check niveaux (visuel) liquide de frein', checked: false },
            { id: 'roue_secours', label: 'Roue de secours', checked: false },
            { id: 'serrage_roues', label: 'Vérifier serrage des roues', checked: false },
            { id: 'pression_pneus', label: 'Vérification pression pneus', checked: false },
            { id: 'valve', label: 'Vérification valve', checked: false },
            { id: 'gicleur', label: 'Gicleur', checked: false },
            { id: 'balais_essuie_glace', label: 'Balais d’essuie glace', checked: false },
            { id: 'retro_interieur', label: 'Fonctionnement rétroviseur', checked: false },
            { id: 'radio', label: 'Radio', checked: false },
            { id: 'carte_visite', label: 'Carte visite', checked: false },
            { id: 'remise_heure', label: 'Remise à l’heure', checked: false },
            { id: 'fonctionnement_clim', label: 'Check fonctionnement clim', checked: false },
            { id: 'effacement_defaut', label: 'Effacement défaut', checked: false },
            { id: 'remise_service_vidange', label: 'Remise à 0 des services (vidange)', checked: false },
            { id: 'feux_exterieurs', label: 'Vérifier les feux extérieurs', checked: false },
            { id: 'clignotants', label: 'Vérifier clignotants', checked: false },
            { id: 'voyants_tableau_bord', label: 'Check voyants tableau de bord', checked: false },
            { id: 'execution_travaux', label: 'Exécutions des travaux', checked: false },
            { id: 'demandes_client', label: 'Demandes client', checked: false },
            { id: 'camera_recul', label: 'Caméra de recul', checked: false },
            { id: 'klaxon', label: 'Klaxon', checked: false },
            { id: 'fonctionnement_fenetres', label: 'Fonctionnement des fenêtres', checked: false },
            { id: 'anti_vol', label: 'Vérifier anti-vol', checked: false },
            { id: 'fonctionnement_sieges', label: 'Vérifier fonctionnement des sièges', checked: false },
            { id: 'avertisseurs', label: 'Vérifier les avertisseurs av + arr', checked: false },
            { id: 'reglage_horloge', label: 'Réglage de toutes les horloges + date à jour', checked: false },
            { id: 'presence_caches', label: 'Vérification présence de tous les caches (y compris sousbassement)', checked: false },
          ],
        },
        {
          id: 'check_dossier',
          label: 'Check Dossier',
          items: [
            { id: 'diag_entree', label: 'DIAG entrée', checked: false },
            { id: 'check_complet', label: 'Check complet', checked: false },
            { id: 'fiche_controle_signee', label: 'Fiche contrôle systématique signée', checked: false },
            { id: 'fiche_atelier_signee', label: 'Fiche atelier complétée avec nom mécano + signature', checked: false },
            { id: 'diag_sortie_copie', label: 'DIAG sortie + copie', checked: false },
            { id: 'bon_sortie', label: 'Bon de sortie', checked: false },
            { id: 'verifier_depenses', label: 'Vérifier toutes les dépenses', checked: false },
            { id: 'facture_proforma', label: 'Facture proforma', checked: false },
          ],
        },
        {
          id: 'sortie_definitif',
          label: 'Check Sortie Véhicule Définitif',
          items: [
            { id: 'contre_visite_precheck', label: 'Contre visite pre-check', checked: false },
            { id: 'doc_garage_sorti', label: 'Vérifier que doc garage sont sorti', checked: false },
            { id: 'photo_carrosserie', label: 'Photo carrosserie', checked: false },
            { id: 'autocollant', label: 'Autocollant', checked: false },
            { id: 'photos_panneau', label: 'Prise de photos panneau', checked: false },
            { id: 'lavage_exterieur', label: 'Lavage extérieur', checked: false },
            { id: 'lavage_interieur', label: 'Lavage intérieur', checked: false },
            { id: 'papiers_vehicule', label: 'Vérifier tous les papiers véhicule', checked: false },
            { id: 'carte_grise', label: 'Carte grise', checked: false },
          ],
        },
      ],
    }
  }

  const [checkInSheet, setCheckInSheet] = useState<VehicleCheckSheet | null>(null)
  const [checkOutSheet, setCheckOutSheet] = useState<VehicleCheckSheet | null>(null)
  const [checkSheetSaving, setCheckSheetSaving] = useState<'in' | 'out' | null>(null)
  
  useEffect(() => {
    if (!jobOrder) return
    setNewStatus(jobOrder.status)
    setInspection(jobOrder.inspection || null)
    setInspectionMileage(jobOrder.inspection?.mileage ? String(jobOrder.inspection.mileage) : '')
    setInspectionInspector(jobOrder.inspection?.inspectorName || '')
    setInspectionGlobalRemarks(jobOrder.inspection?.globalRemarks || '')
    setCheckInSheet(jobOrder.checkInSheet || null)
    setCheckOutSheet(jobOrder.checkOutSheet || null)
  }, [jobOrder])

  useEffect(() => {
    if (!jobOrder) return
    if (activeTab === 'check_in' && !checkInSheet) {
      setCheckInSheet(createDefaultCheckInSheet())
    }
  }, [activeTab, checkInSheet, jobOrder])

  useEffect(() => {
    if (!jobOrder) return
    if (activeTab === 'check_out' && !checkOutSheet) {
      setCheckOutSheet(createDefaultCheckOutSheet())
    }
  }, [activeTab, checkOutSheet, jobOrder])
  
  if (!jobOrder) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ordre de réparation introuvable</h1>
          <p className="text-gray-600 mb-6">L'ordre de réparation que vous recherchez n'existe pas.</p>
          <button
            onClick={() => navigate('/job-orders')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retour aux ordres de réparation
          </button>
        </div>
      </div>
    )
  }
  
  const relatedDeliveryNote = deliveryNotes.find(dn => dn.jobOrderId === jobOrder.id)

  const handleCheckSheetToggle = (
    kind: 'in' | 'out',
    sectionId: string,
    itemId: string,
    checked: boolean
  ) => {
    const setter = kind === 'in' ? setCheckInSheet : setCheckOutSheet
    const creator = kind === 'in' ? createDefaultCheckInSheet : createDefaultCheckOutSheet
    setter(prev => {
      const base = prev || creator()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item => item.id === itemId ? { ...item, checked } : item)
              }
            : section
        )
      }
    })
  }

  const handleCheckSheetNote = (
    kind: 'in' | 'out',
    sectionId: string,
    itemId: string,
    note: string
  ) => {
    const setter = kind === 'in' ? setCheckInSheet : setCheckOutSheet
    const creator = kind === 'in' ? createDefaultCheckInSheet : createDefaultCheckOutSheet
    setter(prev => {
      const base = prev || creator()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item => item.id === itemId ? { ...item, note } : item)
              }
            : section
        )
      }
    })
  }

  const handleCheckSheetField = (kind: 'in' | 'out', field: keyof VehicleCheckSheet, value: any) => {
    const setter = kind === 'in' ? setCheckInSheet : setCheckOutSheet
    const creator = kind === 'in' ? createDefaultCheckInSheet : createDefaultCheckOutSheet
    setter(prev => {
      const base = prev || creator()
      return { ...base, [field]: value }
    })
  }

  const handleCheckSheetEvidenceUpload = (
    kind: 'in' | 'out',
    sectionId: string,
    itemId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const setter = kind === 'in' ? setCheckInSheet : setCheckOutSheet
    const creator = kind === 'in' ? createDefaultCheckInSheet : createDefaultCheckOutSheet

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') return
        const image: JobImage = {
          id: `chk_${Date.now()}_${file.name}`,
          url: result,
          filename: file.name,
          description: '',
          uploadDate: new Date().toISOString().split('T')[0],
          category: 'other'
        }
        setter(prev => {
          const base = prev || creator()
          return {
            ...base,
            sections: base.sections.map(section =>
              section.id === sectionId
                ? {
                    ...section,
                    items: section.items.map(item => {
                      if (item.id !== itemId) return item
                      const existing = item.evidenceImages || []
                      return { ...item, evidenceImages: [...existing, image] }
                    })
                  }
                : section
            )
          }
        })
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  const handleCheckSheetEvidenceDelete = (
    kind: 'in' | 'out',
    sectionId: string,
    itemId: string,
    imageId: string
  ) => {
    const setter = kind === 'in' ? setCheckInSheet : setCheckOutSheet
    const creator = kind === 'in' ? createDefaultCheckInSheet : createDefaultCheckOutSheet
    setter(prev => {
      const base = prev || creator()
      return {
        ...base,
        sections: base.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map(item => {
                  if (item.id !== itemId) return item
                  const next = (item.evidenceImages || []).filter(img => img.id !== imageId)
                  return { ...item, evidenceImages: next.length ? next : undefined }
                })
              }
            : section
        )
      }
    })
  }

  const handleCheckInSave = () => {
    const base = checkInSheet || createDefaultCheckInSheet()
    setCheckSheetSaving('in')
    updateJobOrder(jobOrder.id, { checkInSheet: base })
      .finally(() => setCheckSheetSaving(prev => prev === 'in' ? null : prev))
  }

  const handleCheckOutSave = () => {
    const base = checkOutSheet || createDefaultCheckOutSheet()
    setCheckSheetSaving('out')
    updateJobOrder(jobOrder.id, { checkOutSheet: base })
      .finally(() => setCheckSheetSaving(prev => prev === 'out' ? null : prev))
  }

  const handleSetTab = (tab: 'overview' | 'inspection' | 'check_in' | 'check_out' | 'parts' | 'labor' | 'diagnostics' | 'images' | 'documents') => {
    setActiveTab(tab)
    navigate(`/job-orders/${id}?tab=${tab}`, { replace: true })
  }

  const handleStatusUpdate = () => {
    updateJobStatus(jobOrder.id, newStatus, statusNotes)
    setShowStatusModal(false)
    setStatusNotes('')
  }

  const handleApproveJobOrder = async () => {
    if (!currentUser) {
      alert('Vous devez être connecté pour approuver les ordres de réparation.')
      return
    }

    if (!isJobOrderReadyForApproval(jobOrder)) {
      alert('L\'ordre de réparation n\'est pas prêt pour l\'approbation. Veuillez vous assurer que toutes les informations requises sont complètes.')
      return
    }

    try {
      // Approve the job order
      approveJobOrder(jobOrder.id, approvalNotes, currentUser.id)
      
      // Log the approval activity
      useAuthStore.getState().logActivity('JOB_ORDER_APPROVED', {
        jobOrderId: jobOrder.id,
        jobNumber: jobOrder.jobNumber,
        approvedBy: currentUser.username,
        approvalNotes: approvalNotes
      })

      // Automatically generate delivery note
      const customer = customers.find(c => c.id === jobOrder.customerId)
      const deliveryNote = await createDeliveryNote(
        {
          jobOrderId: jobOrder.id,
          customerId: jobOrder.customerId || 'default-customer',
          technicians: jobOrder.laborItems.map(labor => labor.mechanic),
          documentNumber: '',
          notes: `Bon de livraison généré automatiquement depuis l'ordre de réparation approuvé ${jobOrder.jobNumber}. ${approvalNotes}`
        },
        {
          customerName: jobOrder.customerName,
          vehicleInfo: jobOrder.vehicleInfo,
          customerContact: {
            email: customer?.email || '',
            phone: customer?.phone || '',
            address: customer?.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}` : ''
          },
          partsUsed: jobOrder.partsUsed,
          laborItems: jobOrder.laborItems
        }
      )

      if (!deliveryNote) {
        throw new Error('La création du bon de livraison a échoué.')
      }

      // Log delivery note creation
      useAuthStore.getState().logActivity('DELIVERY_NOTE_CREATED_FROM_APPROVAL', {
        deliveryNoteId: deliveryNote.id,
        blNumber: deliveryNote.blNumber,
        jobOrderId: jobOrder.id,
        jobNumber: jobOrder.jobNumber,
        createdBy: currentUser.username
      })

      alert(`L'ordre de réparation ${jobOrder.jobNumber} a été approuvé et le bon de livraison ${deliveryNote.blNumber} a été généré automatiquement.`)
      
      // Close modal and reset
      setShowApprovalModal(false)
      setApprovalNotes('')
      
      // Navigate to the newly created delivery note
      navigate(`/delivery-notes/${deliveryNote.id}`)
      
    } catch (error) {
      console.error('Error approving job order:', error)
      alert('Erreur lors de l\'approbation de l\'ordre de réparation. Veuillez réessayer.')
      
      // Log the error
      useAuthStore.getState().logActivity('JOB_ORDER_APPROVAL_FAILED', {
        jobOrderId: jobOrder.id,
        jobNumber: jobOrder.jobNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptedBy: currentUser.username
      })
    }
  }

  const handleAddPart = async (inventoryItem?: InventoryItem, quantity: number = 1) => {
    if (inventoryItem) {
      // Check if enough quantity available
      if (inventoryItem.quantity < quantity) {
        alert(`Quantité insuffisante. Stock disponible : ${inventoryItem.quantity}`)
        return
      }

      // Reduce inventory quantity
      await adjustStock(inventoryItem.id, inventoryItem.quantity - quantity, 'Job Order - Part Added', jobOrder.jobNumber)

      const newPart: JobPart = {
        id: `part_${Date.now()}`,
        partNumber: inventoryItem.sku,
        name: inventoryItem.name,
        description: inventoryItem.description,
        quantity: quantity,
        unitCost: inventoryItem.sellingPrice,
        totalCost: 0,
        status: 'ordered',
        orderedDate: new Date().toISOString().split('T')[0],
        supplier: inventoryItem.supplierId
      }
      addPartToJob(jobOrder.id, newPart)
    } else {
      // Original behavior for manual part creation
      const newPart: JobPart = {
        id: `part_${Date.now()}`,
        partNumber: 'NOUVELLE-PIÈCE',
        name: 'Nouvelle Pièce',
        description: 'Description de la nouvelle pièce',
        quantity: 1,
        unitCost: 0,
        totalCost: 0,
        status: 'ordered',
        orderedDate: new Date().toISOString().split('T')[0]
      }
      addPartToJob(jobOrder.id, newPart)
    }
    setShowInventoryPicker(false)
  }

  const handleAddLabor = (taskDescription?: string, mechanicName?: string, hours?: number) => {
    const newLabor: LaborItem = {
      id: `labor_${Date.now()}`,
      description: taskDescription || 'Description de la main d\'œuvre',
      hours: hours || 0,
      rate: mechanic?.hourlyRate || 85,
      total: (hours || 0) * (mechanic?.hourlyRate || 85),
      mechanic: mechanicName || mechanic?.name || 'Inconnu',
      date: new Date().toISOString().split('T')[0]
    }
    addLaborToJob(jobOrder.id, newLabor)
    setShowTaskInput(false)
    setNewTaskDescription('')
    setSelectedMechanic('')
    setTaskHours('')
  }
  const [previewImage, setPreviewImage] = useState<JobImage | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') return
        const newImage: JobImage = {
          id: `img_${Date.now()}_${file.name}`,
          url: result,
          filename: file.name,
          description: 'Image téléchargée',
          uploadDate: new Date().toISOString().split('T')[0],
          category: 'other'
        }
        addImageToJob(jobOrder.id, newImage)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleGenerateDeliveryNote = async () => {
    // Check if job order has already been transferred
    if (jobOrder.status === 'transferred') {
      const existingDeliveryNote = deliveryNotes.find(dn => dn.jobOrderId === jobOrder.id)
      if (existingDeliveryNote) {
        alert(`Cet ordre de réparation a déjà été transféré vers le bon de livraison ${existingDeliveryNote.blNumber}. Redirection vers le bon de livraison.`)
        navigate(`/delivery-notes/${existingDeliveryNote.id}`)
        return
      }
    }

    // Validate required data
    if (!jobOrder.partsUsed || jobOrder.partsUsed.length === 0) {
      alert('Aucune pièce utilisée sur cet ordre. Ajoutez des pièces avant de générer un bon de livraison.')
      return
    }

    if (!jobOrder.customerId) {
      alert('Aucun client assigné à cet ordre de réparation. Veuillez d\'abord assigner un client.')
      return
    }

    try {
      const customer = customers.find(c => c.id === jobOrder.customerId)
      if (!customer) {
        alert('Informations client introuvables. Veuillez vérifier les données client.')
        return
      }

      // Prepare comprehensive job data for transfer
      const jobDescriptions = jobOrder.jobDescriptions?.map(desc => ({
        id: desc.id,
        jobNumber: jobOrder.jobNumber,
        description: desc.description,
        detailedDescription: desc.description,
        category: 'General Service',
        priority: desc.priority,
        estimatedHours: desc.estimatedHours,
        actualHours: jobOrder.actualHours || 0,
        completedDate: jobOrder.completionDate,
        status: jobOrder.completionDate ? 'completed' as const : 'pending' as const,
        notes: `Tâche issue de l'ordre de réparation ${jobOrder.jobNumber}`
      })) || []

      const diagnosticReports: any[] = []

      // Create delivery note with comprehensive job order data
      console.log('Creating delivery note with data:', {
        jobOrderId: jobOrder.id,
        customerId: jobOrder.customerId,
        jobDescriptions: jobDescriptions,
        diagnosticReports: diagnosticReports,
        partsCount: jobOrder.partsUsed?.length,
        laborCount: jobOrder.laborItems?.length
      })

      const deliveryNote = await createDeliveryNote(
        {
          jobOrderId: jobOrder.id,
          customerId: jobOrder.customerId,
          technicians: jobOrder.laborItems?.map(labor => labor.mechanic).filter(Boolean) || [],
          documentNumber: '',
          notes: `Bon de livraison généré automatiquement depuis l'ordre de réparation ${jobOrder.jobNumber}. Description originale : ${jobOrder.description}`,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          deliveryNotes: `Transféré depuis l'ordre de réparation ${jobOrder.jobNumber}. Veuillez vérifier toutes les descriptions de tâches et les rapports de diagnostic joints.`,
          jobsPerformed: jobDescriptions,
          diagnosticReports: diagnosticReports
        },
        {
          customerName: jobOrder.customerName,
          vehicleInfo: jobOrder.vehicleInfo,
          customerContact: {
            email: customer?.email || '',
            phone: customer?.phone || '',
            address: customer?.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}` : ''
          },
          partsUsed: jobOrder.partsUsed,
          laborItems: jobOrder.laborItems
        }
      )

      if (!deliveryNote) {
        throw new Error('La création du bon de livraison a échoué.')
      }

      console.log('Delivery note created successfully:', {
        id: deliveryNote.id,
        blNumber: deliveryNote.blNumber,
        jobOrderId: deliveryNote.jobOrderId,
        status: deliveryNote.status
      })

      // Mark job order as transferred to prevent duplicate transfers
      markJobOrderAsTransferred(jobOrder.id, deliveryNote.id)
      console.log('Job order marked as transferred')

      // Log the successful transfer
      useAuthStore.getState().logActivity('JOB_ORDER_TRANSFERRED_TO_DELIVERY_NOTE', {
        jobOrderId: jobOrder.id,
        jobNumber: jobOrder.jobNumber,
        deliveryNoteId: deliveryNote.id,
        blNumber: deliveryNote.blNumber,
        transferredBy: currentUser?.username || 'System',
        totalParts: jobOrder.partsUsed?.length || 0,
        totalLabor: jobOrder.laborItems?.length || 0,
        finalCost: jobOrder.finalCost
      })

      // Show success confirmation
      alert(`✅ Succès ! L'ordre de réparation ${jobOrder.jobNumber} a été transféré avec succès vers le bon de livraison ${deliveryNote.blNumber}. Vous allez maintenant être redirigé vers le bon de livraison.`)
      
      // Navigate to the newly created delivery note
      navigate(`/delivery-notes/${deliveryNote.id}`)
      
    } catch (error) {
      console.error('Error creating delivery note:', error)
      
      // Log the error
      useAuthStore.getState().logActivity('JOB_ORDER_TRANSFER_FAILED', {
        jobOrderId: jobOrder.id,
        jobNumber: jobOrder.jobNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        attemptedBy: currentUser?.username || 'System'
      })

      // Show detailed error message with resolution steps
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
      alert(`❌ Erreur lors de la création du bon de livraison : ${errorMessage}

Veuillez vérifier les points suivants et réessayer :
1. Assurez-vous que l'ordre de réparation contient des pièces ou de la main d'œuvre
2. Vérifiez que les informations client sont complètes
3. Vérifiez que tous les champs requis sont remplis
4. Si le problème persiste, contactez l'administrateur système

Les détails de l'erreur ont été enregistrés pour examen.`)
    }
  }

  const handleSyncDeliveryNote = async () => {
    if (!jobOrder) return

    const existingDeliveryNote = deliveryNotes.find(dn => dn.jobOrderId === jobOrder.id && dn.status !== 'cancelled')
    if (!existingDeliveryNote) {
      alert('Aucun bon de livraison lié à cet ordre de réparation. Veuillez d\'abord transférer vers un BL.')
      return
    }

    const jobParts = jobOrder.partsUsed || []
    const jobLabor = jobOrder.laborItems || []

    if (jobParts.length === 0 && jobLabor.length === 0) {
      if (!confirm('Cet ordre de réparation ne contient aucune pièce ni main-d\'œuvre. Continuer la synchronisation et vider les lignes du bon de livraison lié ?')) {
        return
      }
    } else {
      if (!confirm('Synchroniser cet ordre de réparation va remplacer les lignes de pièces et de main-d\'œuvre du bon de livraison lié. Continuer ?')) {
        return
      }
    }

    try {
      await syncDeliveryNoteFromJobOrder(jobOrder.id)
      alert(`Le bon de livraison ${existingDeliveryNote.blNumber} a été synchronisé avec cet ordre de réparation.`)
    } catch (error) {
      console.error('Error synchronizing delivery note from job order:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/job-orders')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour aux ordres de réparation</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-8">
            {/* Left Column: Title & Metadata */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {jobOrder.jobNumber}
                  {canUpdate && (
                  <button 
                    onClick={() => setShowEditModal(true)} 
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50" 
                    title="Modifier l'ordre de réparation"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(jobOrder.priority)}`}>
                    {jobOrder.priority === 'urgent' ? 'URGENT' : 
                     jobOrder.priority === 'high' ? 'HAUTE' : 
                     jobOrder.priority === 'medium' ? 'MOYENNE' : 'BASSE'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(jobOrder.status)}`}>
                    {jobOrder.status === 'completed' ? 'TERMINÉ' :
                     jobOrder.status === 'in-progress' ? 'EN COURS' :
                     jobOrder.status === 'waiting-parts' ? 'EN ATTENTE DE PIÈCES' :
                     jobOrder.status === 'pending' ? 'EN ATTENTE' :
                     jobOrder.status === 'cancelled' ? 'ANNULÉ' :
                     jobOrder.status === 'approved' ? 'APPROUVÉ' :
                     jobOrder.status === 'transferred' ? 'TRANSFÉRÉ' : (jobOrder.status as string).toUpperCase()}
                  </span>
                  {isOverdue && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      EN RETARD
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                {jobOrder.description}
              </p>
            </div>

            {/* Right Column: Actions Toolbar */}
            <div className="flex flex-col gap-4 min-w-[300px]">
              {/* Document Actions Group */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePrint(true)}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 rounded-lg transition-all text-center h-full"
                    title={canViewPrices ? "Voir l'ordre de réparation complet avec les prix" : "Voir l'ordre de réparation"}
                  >
                    <FileText className="w-5 h-5 mb-1 text-blue-600" />
                    <span className="text-xs font-medium">Voir l'ordre</span>
                  </button>
                  <button
                    onClick={() => handlePrint(false)}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg transition-all text-center h-full"
                    title="Imprimer sans prix"
                  >
                    <Printer className="w-5 h-5 mb-1 text-gray-600" />
                    <span className="text-xs font-medium">Imprimer sans prix</span>
                  </button>
                </div>
              </div>

              {/* Workflow Actions Group */}
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {canApproveJobOrders && jobOrder.status !== 'approved' && isJobOrderReadyForApproval(jobOrder) && (
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm font-medium"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Approuver</span>
                  </button>
                )}
                
                {jobOrder.status === 'approved' && (
                  <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>APPROUVÉ</span>
                  </span>
                )}
                
                {jobOrder.status === 'transferred' && (
                  <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>TRANSFÉRÉ</span>
                  </span>
                )}
                
                {jobOrder.status === 'transferred' && relatedDeliveryNote && (
                  <button
                    onClick={handleSyncDeliveryNote}
                    className="bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium shadow-sm"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Synchroniser le BL</span>
                  </button>
                )}
                
                {jobOrder.status !== 'transferred' && (
                  <button
                    onClick={handleGenerateDeliveryNote}
                    className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  >
                    <Package className="w-4 h-4" />
                    <span>Vers Bon de Livraison</span>
                  </button>
                )}
                
                {canUpdate && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Mettre à jour le statut</span>
                </button>
                )}
              </div>
            </div>
          </div>

          {/* Job Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{jobOrder.estimatedHours}h</div>
              <div className="text-sm text-gray-600">Estimé</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{jobOrder.actualHours}h</div>
              <div className="text-sm text-gray-600">Réel</div>
            </div>
            {/* Prices hidden in repair process */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatDate(jobOrder.deadline)}</div>
              <div className="text-sm text-gray-600">Échéance</div>
            </div>
          </div>
        </div>

      {/* Customer & Vehicle Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Informations Client
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Nom</p>
              <p className="font-medium text-gray-900">{jobOrder.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Véhicule</p>
              <p className="font-medium text-gray-900">
                {jobOrder.vehicleInfo.make} {jobOrder.vehicleInfo.model} ({jobOrder.vehicleInfo.year})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">VIN / Immatriculation</p>
              <p className="font-medium text-gray-900">
                {jobOrder.vehicleInfo.vin} / {jobOrder.vehicleInfo.registration}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2" />
            Détails de l'Affectation
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Mécanicien Assigné</p>
              <p className="font-medium text-gray-900">{mechanic?.name || 'Inconnu'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date de Début</p>
              <p className="font-medium text-gray-900">{formatDate(jobOrder.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Créé Par</p>
              <p className="font-medium text-gray-900">{jobOrder.createdBy}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Aperçu', icon: FileText },
                { id: 'inspection', label: 'Contrôle véhicule', icon: CheckSquare },
                { id: 'check_in', label: 'Check entrée', icon: LogIn },
                { id: 'check_out', label: 'Check sortie', icon: LogOut },
                { id: 'parts', label: 'Pièces Utilisées', icon: Wrench },
                { id: 'labor', label: 'Main d\'œuvre', icon: Clock },
                { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
                { id: 'images', label: 'Images', icon: Camera },
                { id: 'documents', label: 'Documents', icon: Package }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSetTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description du Travail</h3>
                <p className="text-gray-700">{jobOrder.description}</p>
              </div>
              {jobOrder.notes && jobOrder.notes.trim() !== '' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">
                    {jobOrder.notes
                      .split('\n')
                      .filter(line => 
                        line.trim() !== '' &&
                        !line.startsWith('Transferred to delivery note:') &&
                        !line.includes('BL supprimé, statut réinitialisé pour nouveau transfert')
                      )
                      .join('\n')}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Rentabilité du véhicule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Pièces (prix d'achat)</div>
                    <div className="text-xl font-semibold text-gray-900">{canViewPrices ? formatCurrency(partsBuyTotal) : '—'}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Pièces (prix de vente)</div>
                    <div className="text-xl font-semibold text-gray-900">{canViewPrices ? formatCurrency(partsSellTotal) : '—'}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Main d'œuvre (valeur)</div>
                    <div className="text-xl font-semibold text-gray-900">{canViewPrices ? formatCurrency(laborSellTotal) : '—'}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Heures travaillées</div>
                    <div className="text-xl font-semibold text-gray-900">{laborHoursTotal}h</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Dépenses véhicule</div>
                    <div className="text-xl font-semibold text-gray-900">{canViewPrices ? formatCurrency(vehicleExpenseTotal) : '—'}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Bénéfice</div>
                    <div className={`text-xl font-semibold ${canViewPrices ? benefitClass : 'text-gray-900'}`}>
                      {canViewPrices ? formatCurrency(benefitTotal) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Dépenses véhicule</h3>
                  <span className="text-sm font-semibold text-red-600">{canViewPrices ? formatCurrency(vehicleExpenseTotal) : '—'}</span>
                </div>
                {vehicleExpenses.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune dépense liée à ce véhicule.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motif</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vehicleExpenses.map(expense => (
                          <tr key={expense.id}>
                            <td className="px-4 py-2 text-sm text-gray-700">{formatDate(expense.date)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{expense.reference || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{expense.category || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{expense.paymentMethod || '—'}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-red-600">{canViewPrices ? formatCurrency(expense.amount) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Entrées véhicule (avance)</h3>
                  <span className="text-sm font-semibold text-green-700">{canViewPrices ? formatCurrency(vehicleEntryTotal) : '—'}</span>
                </div>
                {vehicleEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune entrée liée à ce véhicule.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motif</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vehicleEntries.map(entry => (
                          <tr key={entry.id}>
                            <td className="px-4 py-2 text-sm text-gray-700">{formatDate(entry.date)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{entry.reference || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{entry.paymentMethod || '—'}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-green-700">{canViewPrices ? formatCurrency(entry.amount) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'inspection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date du contrôle</label>
                  <input
                    type="text"
                    value={(inspection?.date && new Date(inspection.date).toLocaleDateString()) || new Date().toLocaleDateString()}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage</label>
                  <input
                    type="number"
                    value={inspectionMileage}
                    onChange={(e) => setInspectionMileage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="kms compteur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrôle effectué par</label>
                  <input
                    type="text"
                    value={inspectionInspector}
                    onChange={(e) => setInspectionInspector(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Nom du contrôleur"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {(inspection || createDefaultInspection()).sections.map(section => (
                  <div key={section.id} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{section.label}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point de contrôle</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">État</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarque</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preuve</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {section.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-700 align-top">{item.label}</td>
                              <td className="px-4 py-2 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {(['ok', 'monitor', 'action'] as InspectionStatus[]).map(status => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleInspectionStatusChange(section.id, item.id, status)}
                                      className={`px-2 py-1 text-xs rounded border ${
                                        item.status === status
                                          ? status === 'ok'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : status === 'monitor'
                                            ? 'bg-yellow-500 text-white border-yellow-500'
                                            : 'bg-red-600 text-white border-red-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {status === 'ok' && 'Bon état'}
                                      {status === 'monitor' && 'À surveiller'}
                                      {status === 'action' && 'Intervention à faire'}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top">
                                <input
                                  type="text"
                                  value={item.comment || ''}
                                  onChange={(e) => handleInspectionCommentChange(section.id, item.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  placeholder="Remarque..."
                                />
                              </td>
                              <td className="px-4 py-2 align-top">
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-3 h-3 mr-1" />
                                    Ajouter
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleInspectionEvidenceUpload(section.id, item.id, e)}
                                    />
                                  </label>
                                  {!!item.evidenceImages?.length && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.evidenceImages.slice(0, 3).map((img) => (
                                        <div key={img.id} className="relative">
                                          <img src={img.url} alt={img.filename} className="h-8 w-8 object-cover border border-gray-200 rounded" />
                                          <button
                                            type="button"
                                            onClick={() => handleInspectionEvidenceDelete(section.id, item.id, img.id)}
                                            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-50"
                                            title="Supprimer"
                                          >
                                            <Trash className="w-3 h-3 text-gray-600" />
                                          </button>
                                        </div>
                                      ))}
                                      {item.evidenceImages.length > 3 && (
                                        <div className="h-8 px-2 flex items-center text-xs text-gray-600 border border-gray-200 rounded">
                                          +{item.evidenceImages.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarques générales</label>
                <textarea
                  value={inspectionGlobalRemarks}
                  onChange={(e) => setInspectionGlobalRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={3}
                  placeholder="Remarques générales sur l'état du véhicule"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrintInspection}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium mr-3 inline-flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={handleInspectionSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Enregistrer le contrôle
                </button>
              </div>
            </div>
          )}

          {activeTab === 'check_in' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={(checkInSheet?.date ? new Date(checkInSheet.date) : new Date()).toISOString().split('T')[0]}
                    onChange={(e) => handleCheckSheetField('in', 'date', new Date(e.target.value).toISOString())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KMS d'entrée</label>
                  <input
                    type="number"
                    value={checkInSheet?.mileage ?? ''}
                    onChange={(e) => handleCheckSheetField('in', 'mileage', e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="KMS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carburant</label>
                  <input
                    type="text"
                    value={checkInSheet?.fuel || ''}
                    onChange={(e) => handleCheckSheetField('in', 'fuel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Essence / Diesel..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date mise en circulation</label>
                  <input
                    type="date"
                    value={checkInSheet?.firstRegistrationDate ? new Date(checkInSheet.firstRegistrationDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleCheckSheetField('in', 'firstRegistrationDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input
                    type="text"
                    value={checkInSheet?.make || ''}
                    onChange={(e) => handleCheckSheetField('in', 'make', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input
                    type="text"
                    value={checkInSheet?.model || ''}
                    onChange={(e) => handleCheckSheetField('in', 'model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation</label>
                  <input
                    type="text"
                    value={checkInSheet?.registration || ''}
                    onChange={(e) => handleCheckSheetField('in', 'registration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de série</label>
                  <input
                    type="text"
                    value={checkInSheet?.vin || ''}
                    onChange={(e) => handleCheckSheetField('in', 'vin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {(checkInSheet?.sections || []).map(section => (
                  <div key={section.id} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{section.label}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Élément</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vérifié</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarque</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preuve</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {section.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-700">{item.label}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!item.checked}
                                  onChange={(e) => handleCheckSheetToggle('in', section.id, item.id, e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={item.note || ''}
                                  onChange={(e) => handleCheckSheetNote('in', section.id, item.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  placeholder="Remarque..."
                                />
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-3 h-3 mr-1" />
                                    Ajouter
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleCheckSheetEvidenceUpload('in', section.id, item.id, e)}
                                    />
                                  </label>
                                  {!!item.evidenceImages?.length && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.evidenceImages.slice(0, 3).map((img) => (
                                        <div key={img.id} className="relative">
                                          <img src={img.url} alt={img.filename} className="h-8 w-8 object-cover border border-gray-200 rounded" />
                                          <button
                                            type="button"
                                            onClick={() => handleCheckSheetEvidenceDelete('in', section.id, item.id, img.id)}
                                            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-50"
                                            title="Supprimer"
                                          >
                                            <Trash className="w-3 h-3 text-gray-600" />
                                          </button>
                                        </div>
                                      ))}
                                      {item.evidenceImages.length > 3 && (
                                        <div className="h-8 px-2 flex items-center text-xs text-gray-600 border border-gray-200 rounded">
                                          +{item.evidenceImages.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrintCheckIn}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium mr-3 inline-flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={handleCheckInSave}
                  disabled={checkSheetSaving === 'in'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {checkSheetSaving === 'in' ? 'Enregistrement...' : 'Enregistrer Check entrée'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'check_out' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={(checkOutSheet?.date ? new Date(checkOutSheet.date) : new Date()).toISOString().split('T')[0]}
                    onChange={(e) => handleCheckSheetField('out', 'date', new Date(e.target.value).toISOString())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KMS de sortie</label>
                  <input
                    type="number"
                    value={checkOutSheet?.mileage ?? ''}
                    onChange={(e) => handleCheckSheetField('out', 'mileage', e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="KMS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carburant</label>
                  <input
                    type="text"
                    value={checkOutSheet?.fuel || ''}
                    onChange={(e) => handleCheckSheetField('out', 'fuel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Essence / Diesel..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date mise en circulation</label>
                  <input
                    type="date"
                    value={checkOutSheet?.firstRegistrationDate ? new Date(checkOutSheet.firstRegistrationDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleCheckSheetField('out', 'firstRegistrationDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input
                    type="text"
                    value={checkOutSheet?.make || ''}
                    onChange={(e) => handleCheckSheetField('out', 'make', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input
                    type="text"
                    value={checkOutSheet?.model || ''}
                    onChange={(e) => handleCheckSheetField('out', 'model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation</label>
                  <input
                    type="text"
                    value={checkOutSheet?.registration || ''}
                    onChange={(e) => handleCheckSheetField('out', 'registration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de série</label>
                  <input
                    type="text"
                    value={checkOutSheet?.vin || ''}
                    onChange={(e) => handleCheckSheetField('out', 'vin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {(checkOutSheet?.sections || []).map(section => (
                  <div key={section.id} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{section.label}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Élément</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vérifié</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarque</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preuve</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {section.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-700">{item.label}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!item.checked}
                                  onChange={(e) => handleCheckSheetToggle('out', section.id, item.id, e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={item.note || ''}
                                  onChange={(e) => handleCheckSheetNote('out', section.id, item.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                  placeholder="Remarque..."
                                />
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-3 h-3 mr-1" />
                                    Ajouter
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleCheckSheetEvidenceUpload('out', section.id, item.id, e)}
                                    />
                                  </label>
                                  {!!item.evidenceImages?.length && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.evidenceImages.slice(0, 3).map((img) => (
                                        <div key={img.id} className="relative">
                                          <img src={img.url} alt={img.filename} className="h-8 w-8 object-cover border border-gray-200 rounded" />
                                          <button
                                            type="button"
                                            onClick={() => handleCheckSheetEvidenceDelete('out', section.id, item.id, img.id)}
                                            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 hover:bg-gray-50"
                                            title="Supprimer"
                                          >
                                            <Trash className="w-3 h-3 text-gray-600" />
                                          </button>
                                        </div>
                                      ))}
                                      {item.evidenceImages.length > 3 && (
                                        <div className="h-8 px-2 flex items-center text-xs text-gray-600 border border-gray-200 rounded">
                                          +{item.evidenceImages.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePrintCheckOut}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium mr-3 inline-flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={handleCheckOutSave}
                  disabled={checkSheetSaving === 'out'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {checkSheetSaving === 'out' ? 'Enregistrement...' : 'Enregistrer Check sortie'}
                </button>
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pièces Utilisées</h3>
                {canUpdate && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowInventoryPicker(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span>Ajouter depuis l'inventaire</span>
                  </button>
                </div>
                )}
              </div>

              {/* Inventory Picker Modal */}
              {showInventoryPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Sélectionner une pièce de l'inventaire</h3>
                        <button
                          onClick={() => setShowInventoryPicker(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher par nom, numéro ou description..."
                          value={inventorySearchTerm}
                          onChange={(e) => setInventorySearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-64">
                      {inventoryItems
                        .filter((item: any) => 
                          inventorySearchTerm === '' || 
                          item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                          item.partNumber.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(inventorySearchTerm.toLowerCase())
                        )
                        .filter((item: any) => item.quantity > 0)
                        .map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2 hover:bg-gray-50">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>Part #: {item.partNumber}</span>
                                <span>Stock : {item.quantity}</span>
                                {canViewPrices && (<span>Prix : {formatCurrency(item.sellingPrice)}</span>)}

                              </div>
                            </div>
                            <button
                              onClick={() => handleAddPart(item, 1)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Ajouter
                            </button>
                          </div>
                        ))
                      }
                      {inventoryItems.filter((item: any) => item.quantity > 0).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>Aucun article disponible</p>
                          <p className="text-sm">Ajoutez des articles à l'inventaire pour permettre la sélection</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {jobOrder.partsUsed.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune pièce utilisée</p>
                  <p className="text-sm">Ajoutez des pièces pour suivre l'utilisation du stock</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobOrder.partsUsed.map((part) => (
                    <div key={part.id} className="p-4 bg-gray-50 rounded-lg">
                      {editingPart === part.id ? (
                        // Edit form for parts
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{part.name}</h4>
                            <select
                              value={editPartData.status}
                              onChange={(e) => setEditPartData({
                                ...editPartData,
                                status: e.target.value as JobPart['status']
                              })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="ordered">COMMANDÉ</option>
                              <option value="received">REÇU</option>
                              <option value="installed">INSTALLÉ</option>
                              <option value="returned">RETourné</option>
                            </select>
                          </div>
                          <p className="text-sm text-gray-600">{part.description}</p>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-600">Qté:</label>
                              <input
                                type="number"
                                value={editPartData.quantity}
                                onChange={(e) => setEditPartData({...editPartData, quantity: parseInt(e.target.value) || 1})}
                                min="1"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            {canViewPrices && (
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Coût unitaire:</label>
                                <input
                                  type="number"
                                  value={editPartData.unitCost}
                                  onChange={(e) => setEditPartData({...editPartData, unitCost: parseFloat(e.target.value) || 0})}
                                  min="0"
                                  step="0.01"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            )}
                            {canViewPrices && (
                              <span className="text-sm text-gray-700 whitespace-nowrap">
                                Total: {formatCurrency(editPartData.quantity * editPartData.unitCost)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingPart(null)
                                setEditPartData({ quantity: 1, unitCost: 0, status: 'ordered' })
                              }}
                              className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => {
                                const totalCost = editPartData.quantity * editPartData.unitCost
                                useJobOrderStore.getState().updatePartInJob(jobOrder.id, part.id, {
                                  ...editPartData,
                                  totalCost
                                })
                                setEditingPart(null)
                                setEditPartData({ quantity: 1, unitCost: 0, status: 'ordered' })
                              }}
                              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode for parts
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{part.name}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                part.status === 'installed' ? 'bg-green-100 text-green-800' :
                                part.status === 'received' ? 'bg-blue-100 text-blue-800' :
                                part.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {part.status === 'installed' ? 'INSTALLÉ' :
                                 part.status === 'received' ? 'REÇU' :
                                 part.status === 'ordered' ? 'COMMANDÉ' :
                                 part.status.toUpperCase()}
                              </span>
                              {canUpdate && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      setEditingPart(part.id)
                                      setEditPartData({
                                        quantity: part.quantity,
                                        unitCost: part.unitCost,
                                        status: part.status
                                      })
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Êtes-vous sûr de vouloir supprimer cette pièce ?')) {
                                        useJobOrderStore.getState().deletePartFromJob(jobOrder.id, part.id)
                                      }
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{part.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span>Part #: {part.partNumber}</span>
                            {canViewPrices ? (
                              <span>Qté : {part.quantity} × {formatCurrency(part.unitCost)} = {formatCurrency(part.totalCost)}</span>
                            ) : (
                              <span>Qté : {part.quantity}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Labor Tab */}
          {activeTab === 'labor' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Main d'œuvre</h3>
                {canUpdate && (
                <div className="flex items-center space-x-2">
                  {!showTaskInput ? (
                    <button
                      onClick={() => setShowTaskInput(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter Main d'œuvre</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="Description de la tâche..."
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                      />
                      <select
                        value={selectedMechanic}
                        onChange={(e) => setSelectedMechanic(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Mécanicien</option>
                        {mechanics.map((mech) => (
                          <option key={mech.id} value={mech.name}>
                            {mech.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Heures"
                        value={taskHours}
                        onChange={(e) => setTaskHours(e.target.value)}
                        min="0"
                        step="0.5"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-20"
                      />
                      {canViewPrices && (
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {formatCurrency(mechanic?.hourlyRate || 85)}/h
                        </span>
                      )}
                      {canViewPrices && (
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatCurrency((parseFloat(taskHours) || 0) * (mechanic?.hourlyRate || 85))}
                        </span>
                      )}
                      <button
                        onClick={() => handleAddLabor(newTaskDescription.trim(), selectedMechanic, parseFloat(taskHours) || 0)}
                        disabled={!newTaskDescription.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors flex items-center"
                        title="Ajouter"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowTaskInput(false)
                          setNewTaskDescription('')
                          setSelectedMechanic('')
                          setTaskHours('')
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center"
                        title="Annuler"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
              {jobOrder.laborItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune main d'œuvre ajoutée</p>
                  <p className="text-sm">Ajoutez de la main d'œuvre pour suivre le temps et les coûts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobOrder.laborItems.map((labor) => (
                    <div key={labor.id} className="p-4 bg-gray-50 rounded-lg">
                      {editingLabor === labor.id ? (
                        // Edit form
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="text"
                              value={editLaborData.description}
                              onChange={(e) => setEditLaborData({...editLaborData, description: e.target.value})}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Description de la tâche"
                            />
                            <select
                              value={editLaborData.mechanic}
                              onChange={(e) => setEditLaborData({...editLaborData, mechanic: e.target.value})}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {mechanics.map((mech) => (
                                <option key={mech.id} value={mech.name}>
                                  {mech.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editLaborData.hours}
                              onChange={(e) => setEditLaborData({...editLaborData, hours: parseFloat(e.target.value) || 0})}
                              min="0"
                              step="0.5"
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Heures"
                            />
                            {canViewPrices && (
                              <input
                                type="number"
                                value={editLaborData.rate}
                                onChange={(e) => setEditLaborData({...editLaborData, rate: parseFloat(e.target.value) || 0})}
                                min="0"
                                step="0.01"
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Taux"
                              />
                            )}
                            {canViewPrices && (
                              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                                {formatCurrency(editLaborData.hours * editLaborData.rate)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingLabor(null)
                                setEditLaborData({ description: '', mechanic: '', hours: 0, rate: 0 })
                              }}
                              className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => {
                                const total = editLaborData.hours * editLaborData.rate
                                useJobOrderStore.getState().updateLaborInJob(jobOrder.id, labor.id, {
                                  ...editLaborData,
                                  total
                                })
                                setEditingLabor(null)
                                setEditLaborData({ description: '', mechanic: '', hours: 0, rate: 0 })
                              }}
                              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{labor.description}</h4>
                            <div className="flex items-center space-x-2">
                              {canViewPrices && (<span className="font-medium text-gray-900">{formatCurrency(labor.total)}</span>)}
                              {canUpdate && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      setEditingLabor(labor.id)
                                      setEditLaborData({
                                        description: labor.description,
                                        mechanic: labor.mechanic,
                                        hours: labor.hours,
                                        rate: labor.rate
                                      })
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                                        useJobOrderStore.getState().deleteLaborFromJob(jobOrder.id, labor.id)
                                      }
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{labor.mechanic}</span>
                            {canViewPrices ? (
                              <span>{labor.hours}h × {formatCurrency(labor.rate)}/h</span>
                            ) : (
                              <span>{labor.hours}h</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{labor.date}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Diagnostics Tab */}
          {activeTab === 'diagnostics' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rapports de Diagnostic</h3>
              </div>
              {canUpdate && <DiagnosticReportUpload jobId={jobOrder.id} />}
              {((jobOrder.diagnosticFiles || []).length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun fichier de diagnostic</p>
                  <p className="text-sm">Téléchargez des rapports (PDF, DOCX ou images)</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {(jobOrder.diagnosticFiles || []).map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {f.title || f.originalName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {f.originalName} • {f.mimeType} • {(f.size/1024).toFixed(1)} KB • Téléchargé le {new Date(f.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      {canUpdate && (
                      <button
                        onClick={async () => {
                          if (!confirm('Supprimer ce fichier ?')) return
                          try {
                            const res = await fetch('/api/diagnostics/delete', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ storedName: f.storedName })
                            })
                            if (!res.ok) throw new Error('Delete failed')
                            useJobOrderStore.getState().deleteDiagnosticFile(jobOrder.id, f.id)
                          } catch (e) {
                            alert('Impossible de supprimer le fichier')
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white"
                        aria-label="Delete diagnostic file"
                      >
                        <Trash className="w-3 h-3" /> Supprimer
                      </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Images Jointes</h3>
                {canUpdate && (
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Télécharger des images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                )}
              </div>
              {(jobOrder.attachedImages || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune image jointe</p>
                  <p className="text-sm">Téléchargez des images pour documenter la réparation</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(jobOrder.attachedImages || []).map((image) => (
                    <div key={image.id} className="bg-gray-50 rounded-lg overflow-hidden">
                      <div
                        className="w-full h-48 bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => setPreviewImage(image)}
                      >
                        <img
                          src={image.url}
                          alt={image.description}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <span className="text-sm text-gray-500">
                          Image non disponible
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{image.filename}</p>
                          <p className="text-sm text-gray-600">{image.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{image.uploadDate}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(image)}
                            className="flex items-center px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Prévisualiser
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteImageFromJob(jobOrder.id, image.id)}
                            className="flex items-center px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash className="w-3 h-3 mr-1" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Associés</h3>
                
                {/* Delivery Notes Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Bons de Livraison</h4>
                  {(() => {
                    const relatedDeliveryNotes = deliveryNotes.filter(
                      dn => dn.jobOrderId === jobOrder.id
                    )
                    return relatedDeliveryNotes.length === 0 ? (
                      <div className="text-gray-500 text-sm">
                        Aucun bon de livraison créé pour cet ordre de réparation.
                        {jobOrder.status === 'completed' && (
                          <button
                            onClick={handleGenerateDeliveryNote}
                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            Générer un bon de livraison
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {relatedDeliveryNotes.map((dn) => (
                          <div key={dn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{dn.blNumber}</p>
                              <p className="text-sm text-gray-600">Statut : {dn.status}</p>
                              <p className="text-sm text-gray-600">Créé : {formatDate(dn.createdAt)}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/delivery-notes/${dn.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Voir →
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Estimates (Devis) Section */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Devis</h4>
                  {(() => {
                    const { estimates } = useEstimateInvoiceStore.getState();
                    const linkedEstimates = estimates.filter(e => e.jobOrderId === jobOrder.id || (jobOrder.linkedEstimateIds || []).includes(e.id));
                    const availableEstimates = estimates.filter(
                      e => !e.jobOrderId && e.customerId === jobOrder.customerId && e.vehicleId === jobOrder.vehicleId
                    );
                    
                    return (
                      <>
                        {linkedEstimates.length === 0 ? (
                          <div className="text-gray-500 text-sm">
                            Aucun devis lié à cet ordre de réparation.
                            {canUpdate && (
                              <button
                                onClick={() => setShowLinkEstimateModal(true)}
                                className="ml-2 text-blue-600 hover:text-blue-800 underline"
                              >
                                Lier un devis existant
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {linkedEstimates.map((estimate) => (
                            <div key={estimate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{estimate.estimateNumber}</p>
                                <p className="text-sm text-gray-600">Statut : {estimate.status}</p>
                                <p className="text-sm text-gray-600">Montant : {canViewPrices ? formatCurrency(estimate.totalAmount) : '—'}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => navigate(`/estimates/${estimate.id}`)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Voir →
                                </button>
                                {canUpdate && (
                                  <button
                                    onClick={() => handleUnlinkEstimate(estimate.id, jobOrder.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Détacher
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        {canUpdate && (
                          <button
                            onClick={() => setShowLinkEstimateModal(true)}
                            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                          >
                            Lier un autre devis
                          </button>
                        )}
                        </div>
                      )}
                      
                      {showLinkEstimateModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Sélectionner un devis à lier</h3>
                                <button
                                  onClick={() => setShowLinkEstimateModal(false)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-6 h-6" />
                                </button>
                              </div>
                            </div>
                            <div className="p-6">
                              {availableEstimates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <p>Aucun devis disponible pour ce client et ce véhicule.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {availableEstimates.map((estimate) => (
                                    <div key={estimate.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{estimate.estimateNumber}</h4>
                                        <p className="text-sm text-gray-600">Statut : {estimate.status}</p>
                                        <p className="text-sm text-gray-600">Montant : {canViewPrices ? formatCurrency(estimate.totalAmount) : '—'}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          handleLinkEstimate(estimate.id, jobOrder.id);
                                          setShowLinkEstimateModal(false);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                      >
                                        Lier
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                    )
                  })()}
                </div>

                {/* Invoices Section */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Factures</h4>
                  {(() => {
                    const relatedDeliveryNotes = deliveryNotes.filter(
                      dn => dn.jobOrderId === jobOrder.id
                    )
                    const invoiceIds = relatedDeliveryNotes.map(dn => dn.relatedInvoiceId).filter(Boolean)
                    const relatedInvoices = invoices.filter(inv => invoiceIds.includes(inv.id))
                    
                    return relatedInvoices.length === 0 ? (
                      <div className="text-gray-500 text-sm">
                        Aucune facture créée pour cet ordre de réparation.
                        {relatedDeliveryNotes.some(dn => dn.status === 'approved') && (
                          <span className="ml-1">
                            Les bons de livraison sont prêts à être convertis en facture.
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {relatedInvoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                              <p className="text-sm text-gray-600">Statut : {invoice.status}</p>
                              <p className="text-sm text-gray-600">Montant : {canViewPrices ? formatCurrency(invoice.totalAmount) : '—'}</p>
                              <p className="text-sm text-gray-600">Échéance : {formatDate(invoice.dueDate)}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Voir →
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Bon de Sortie Section */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Bon de sortie</h4>
                  {jobOrder.status !== 'completed' ? (
                    <div className="text-gray-500 text-sm">
                      Le bon de sortie sera disponible une fois l&apos;ordre de réparation terminé.
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Bon de sortie du véhicule</p>
                        <p className="text-sm text-gray-600">
                          Générer un document à remettre au client lors de la sortie du véhicule.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePrintExitDocument}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mettre à jour le statut</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau statut
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as JobOrder['status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">En attente</option>
                    <option value="in-progress">En cours</option>
                    <option value="waiting-parts">En attente de pièces</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optionnel)
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ajoutez des notes sur le changement de statut..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{previewImage.filename}</p>
                <p className="text-xs text-gray-500 truncate">{previewImage.uploadDate}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.description}
                className="max-h-[80vh] w-auto max-w-full"
              />
            </div>
            {previewImage.description && (
              <div className="px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-700">{previewImage.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isPrintingExitDocument && (() => {
        const customer = customers.find(c => c.id === jobOrder.customerId)
        const tasks = (jobOrder.laborItems || []).map(item => ({
          description: item.description,
          hours: item.hours,
          mechanic: item.mechanic
        }))
        const recipient = {
          name: customer
            ? (customer.type === 'company'
              ? (customer.companyName || `${customer.firstName} ${customer.lastName}`)
              : `${customer.firstName} ${customer.lastName}`)
            : jobOrder.customerName,
          address: customer
            ? `${customer.address.street}, ${customer.address.city} ${customer.address.zipCode}`
            : '',
          phone: customer?.phone,
          email: customer?.email,
          taxId: customer?.ice
        }
        const vehicle = {
          make: jobOrder.vehicleInfo.make,
          model: jobOrder.vehicleInfo.model,
          year: jobOrder.vehicleInfo.year,
          vin: jobOrder.vehicleInfo.vin,
          registration: jobOrder.vehicleInfo.registration
        }
        return (
          <PrintableBonDeSortie
            referenceNumber={`BS-${jobOrder.jobNumber}`}
            date={jobOrder.completionDate || jobOrder.updatedAt || new Date().toISOString()}
            recipient={recipient}
            vehicle={vehicle}
            jobNumber={jobOrder.jobNumber}
            jobDescription={jobOrder.description}
            notes={jobOrder.notes}
            tasks={tasks}
          />
        )
      })()}

      {isPrintingInspection && (() => {
        const customer = customers.find(c => c.id === jobOrder.customerId)
        const recipient = {
          name: customer
            ? (customer.type === 'company'
              ? (customer.companyName || `${customer.firstName} ${customer.lastName}`)
              : `${customer.firstName} ${customer.lastName}`)
            : jobOrder.customerName,
          address: customer
            ? `${customer.address.street}, ${customer.address.city} ${customer.address.zipCode}`
            : '',
          phone: customer?.phone,
          email: customer?.email,
          taxId: customer?.ice
        }
        const vehicle = {
          make: jobOrder.vehicleInfo.make,
          model: jobOrder.vehicleInfo.model,
          year: jobOrder.vehicleInfo.year,
          vin: jobOrder.vehicleInfo.vin,
          registration: jobOrder.vehicleInfo.registration
        }
        const base = inspection || createDefaultInspection()
        const mileageNumber = inspectionMileage ? Number(inspectionMileage) : undefined
        const printableInspection = {
          ...base,
          mileage: mileageNumber,
          inspectorName: inspectionInspector || undefined,
          globalRemarks: inspectionGlobalRemarks || undefined
        }
        return (
          <PrintableVehicleInspection
            referenceNumber={`CV-${jobOrder.jobNumber}`}
            date={printableInspection.date || new Date().toISOString()}
            recipient={recipient}
            vehicle={vehicle}
            jobNumber={jobOrder.jobNumber}
            inspection={printableInspection}
          />
        )
      })()}

      {isPrintingCheckIn && (() => {
        const customer = customers.find(c => c.id === jobOrder.customerId)
        const recipient = {
          name: customer
            ? (customer.type === 'company'
              ? (customer.companyName || `${customer.firstName} ${customer.lastName}`)
              : `${customer.firstName} ${customer.lastName}`)
            : jobOrder.customerName,
          address: customer
            ? `${customer.address.street}, ${customer.address.city} ${customer.address.zipCode}`
            : '',
          phone: customer?.phone,
          email: customer?.email,
          taxId: customer?.ice
        }
        const vehicle = {
          make: jobOrder.vehicleInfo.make,
          model: jobOrder.vehicleInfo.model,
          year: jobOrder.vehicleInfo.year,
          vin: jobOrder.vehicleInfo.vin,
          registration: jobOrder.vehicleInfo.registration
        }
        const sheet = checkInSheet || createDefaultCheckInSheet()
        return (
          <PrintableVehicleCheckSheet
            title="Check entrée"
            referenceNumber={`CE-${jobOrder.jobNumber}`}
            date={sheet.date || new Date().toISOString()}
            recipient={recipient}
            vehicle={vehicle}
            jobNumber={jobOrder.jobNumber}
            sheet={sheet}
          />
        )
      })()}

      {isPrintingCheckOut && (() => {
        const customer = customers.find(c => c.id === jobOrder.customerId)
        const recipient = {
          name: customer
            ? (customer.type === 'company'
              ? (customer.companyName || `${customer.firstName} ${customer.lastName}`)
              : `${customer.firstName} ${customer.lastName}`)
            : jobOrder.customerName,
          address: customer
            ? `${customer.address.street}, ${customer.address.city} ${customer.address.zipCode}`
            : '',
          phone: customer?.phone,
          email: customer?.email,
          taxId: customer?.ice
        }
        const vehicle = {
          make: jobOrder.vehicleInfo.make,
          model: jobOrder.vehicleInfo.model,
          year: jobOrder.vehicleInfo.year,
          vin: jobOrder.vehicleInfo.vin,
          registration: jobOrder.vehicleInfo.registration
        }
        const sheet = checkOutSheet || createDefaultCheckOutSheet()
        return (
          <PrintableVehicleCheckSheet
            title="Check sortie"
            referenceNumber={`CS-${jobOrder.jobNumber}`}
            date={sheet.date || new Date().toISOString()}
            recipient={recipient}
            vehicle={vehicle}
            jobNumber={jobOrder.jobNumber}
            sheet={sheet}
          />
        )
      })()}

      {/* Job Order Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approuver l'ordre de réparation</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Vous êtes sur le point d'approuver l'ordre de réparation <strong>{jobOrder.jobNumber}</strong>. Cette action va :
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-4">
                    <li>Marquer l'ordre comme approuvé</li>
                    <li>Générer automatiquement un bon de livraison</li>
                    <li>Transférer les détails vers le bon de livraison</li>
                    <li>Permettre le début du processus de livraison</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes d'approbation (Optionnel)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ajoutez des notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleApproveJobOrder}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Approuver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifier l'ordre de réparation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mécanicien Assigné</label>
                  <select
                    value={editFormData.assignedMechanic}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedMechanic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={currentUser?.role === 'mechanic'}
                  >
                    <option value="">Sélectionner un mécanicien</option>
                    {(mechanics || []).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} - {Array.isArray(m.specialization) ? m.specialization.join(', ') : m.specialization}{canViewPrices ? ` (${formatCurrency(m.hourlyRate)}/h)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateJobOrder}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobOrderDetail
