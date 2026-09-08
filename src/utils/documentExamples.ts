import { Workshop, Customer, Vehicle, Document } from './renderDocument'

// Example workshop data
export const exampleWorkshop: Workshop = {
  name: 'Garage Dupont',
  address: '123 Rue de la République',
  postalCode: '75001',
  city: 'Paris',
  phone: '01 42 86 52 14',
  email: 'contact@garagedupont.fr',
  siret: '12345678901234',
  vatNumber: 'FR12345678901',
  rcs: 'Paris B 123456789',
  website: 'www.garagedupont.fr',
  logoUrl: 'https://via.placeholder.com/150x60/1f2937/ffffff?text=Garage+Dupont'
}

// Example customer data
export const exampleCustomer: Customer = {
  name: 'Jean Martin',
  address: '45 Avenue Victor Hugo',
  postalCode: '75016',
  city: 'Paris',
  phone: '06 12 34 56 78',
  email: 'jean.martin@email.fr'
}

// Example vehicle data
export const exampleVehicle: Vehicle = {
  make: 'Renault',
  model: 'Clio V',
  registration: 'AB-123-CD',
  vin: 'VF1RFD00612345678',
  year: 2022,
  mileage: 45000
}

// Example document data for different types
export const exampleFacture: Document = {
  number: 'F2024-001',
  date: '2024-03-15',
  dueDate: '2024-04-15',
  lines: [
    {
      ref: 'P001',
      description: "Changement d'huile moteur 5W30",
      quantity: 1,
      unitPrice: 89.90,
      discount: 0,
      lineTotal: 89.90,
      tvaRate: 20
    },
    {
      ref: 'P002',
      description: 'Filtre à huile',
      quantity: 1,
      unitPrice: 24.50,
      discount: 0,
      lineTotal: 24.50,
      tvaRate: 20
    },
    {
      ref: 'P003',
      description: "Main d'œuvre (1h30)",
      quantity: 1.5,
      unitPrice: 65.00,
      discount: 0,
      lineTotal: 97.50,
      tvaRate: 20
    }
  ],
  subtotal: 211.90,
  vatTotal: 42.38,
  grandTotal: 254.28,
  paid: 100.00,
  balance: 154.28
}

export const exampleDevis: Document = {
  number: 'D2024-001',
  date: '2024-03-10',
  dueDate: '2024-04-10',
  validUntil: '2024-04-10',
  lines: [
    {
      ref: 'P001',
      description: 'Changement de distribution',
      quantity: 1,
      unitPrice: 450.00,
      discount: 0,
      lineTotal: 450.00,
      tvaRate: 20
    },
    {
      ref: 'P002',
      description: 'Kit courroie de distribution',
      quantity: 1,
      unitPrice: 180.00,
      discount: 0,
      lineTotal: 180.00,
      tvaRate: 20
    },
    {
      ref: 'P003',
      description: "Main d'œuvre (3h)",
      quantity: 3,
      unitPrice: 65.00,
      discount: 0,
      lineTotal: 195.00,
      tvaRate: 20
    }
  ],
  subtotal: 825.00,
  vatTotal: 165.00,
  grandTotal: 990.00,
  paid: 0,
  balance: 990.00
}

export const exampleBonLivraison: Document = {
  number: 'BL2024-001',
  date: '2024-03-12',
  lines: [
    {
      ref: 'P001',
      description: 'Pneu Michelin 205/55 R16',
      quantity: 2,
      unitPrice: 0,
      discount: 0,
      lineTotal: 0,
      tvaRate: 0
    },
    {
      ref: 'P002',
      description: 'Pneu Michelin 225/45 R17',
      quantity: 2,
      unitPrice: 0,
      discount: 0,
      lineTotal: 0,
      tvaRate: 0
    }
  ],
  subtotal: 0,
  vatTotal: 0,
  grandTotal: 0,
  paid: 0,
  balance: 0
}

export const exampleOrdreReparation: Document = {
  number: 'OR2024-001',
  date: '2024-03-08',
  description: 'Diagnostic moteur - bruit anormal au démarrage',
  lines: [
    {
      ref: 'P001',
      description: 'Diagnostic moteur complet',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      lineTotal: 0,
      tvaRate: 0
    },
    {
      ref: 'P002',
      description: "Vérification du système d'allumage",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      lineTotal: 0,
      tvaRate: 0
    }
  ],
  labor: [
    {
      description: 'Diagnostic moteur',
      hours: 2,
      hourlyRate: 0,
      totalAmount: 0
    },
    {
      description: 'Test compression cylindres',
      hours: 1,
      hourlyRate: 0,
      totalAmount: 0
    }
  ],
  subtotal: 0,
  vatTotal: 0,
  grandTotal: 0,
  paid: 0,
  balance: 0
}

// Helper function to generate complete HTML examples
export function generateExampleHTML(type: 'facture' | 'bon-livraison' | 'devis' | 'ordre-reparation'): string {
  const { renderDocument } = require('./renderDocument')
  
  let document: Document
  switch (type) {
    case 'facture':
      document = exampleFacture
      break
    case 'devis':
      document = exampleDevis
      break
    case 'bon-livraison':
      document = exampleBonLivraison
      break
    case 'ordre-reparation':
      document = exampleOrdreReparation
      break
    default:
      document = exampleFacture
  }
  
  return renderDocument(type, exampleWorkshop, document, exampleCustomer, exampleVehicle)
}

// Export all examples as a single object for easy access
export const documentExamples = {
  workshop: exampleWorkshop,
  customer: exampleCustomer,
  vehicle: exampleVehicle,
  facture: exampleFacture,
  devis: exampleDevis,
  bonLivraison: exampleBonLivraison,
  ordreReparation: exampleOrdreReparation
}