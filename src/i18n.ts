const translations = {
  fr: {
    nav: {
      dashboard: 'Tableau de bord',
      workshop: 'Atelier',
      sales: 'Ventes',
      jobs: 'Ordres de travail',
      customers: 'Clients',
      documents: 'Documents',
      inventory: 'Inventaire',
      deliveryNotes: 'Bons de livraison',
      invoices: 'Factures',
      payments: 'Paiements',
      reports: 'Rapports',
      techPerformance: 'Performance des techniciens',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
    supplierDeliveryNotes: {
      header: 'Bons de livraison fournisseurs',
      subtitle: 'Gérez vos bons de livraison fournisseurs et suivez les articles reçus',
      newDeliveryNote: 'Nouveau bon de livraison',
      stats: {
        totalNotes: 'Total des BL',
        draft: 'Brouillons',
        validated: 'Validés',
        invoiced: 'Facturés',
        totalAmount: 'Montant Total',
      },
      filters: {
        search: 'Rechercher',
        searchPlaceholder: 'Rechercher par numéro, notes...',
        supplier: 'Fournisseur',
        allSuppliers: 'Tous les fournisseurs',
        status: 'Statut',
        allStatuses: 'Tous les statuts',
        dateRange: 'Période',
        all: 'Tous',
        pending: 'En attente',
        partial: 'Partiel',
        received: 'Reçu',
        draft: 'Brouillon',
        validated: 'Validé',
        invoiced: 'Facturé',
        cancelled: 'Annulé',
        fromDate: 'Date de début',
        toDate: 'Date de fin',
      },
      table: {
        dnNumber: 'Numéro',
        supplier: 'Fournisseur',
        deliveryDate: 'Date de livraison',
        status: 'Statut',
        amountTTC: 'Montant (TTC)',
        items: 'Articles',
        actions: 'Actions',
      },
      empty: {
        noNotes: 'Aucun bon de livraison pour le moment.',
        noMatch: 'Aucun bon de livraison ne correspond à vos filtres actuels.',
        getStarted: 'Commencez par créer votre premier bon de livraison.',
      },
      actions: {
        view: 'Voir',
        edit: 'Modifier',
        delete: 'Supprimer',
        receive: 'Recevoir les articles',
      },
      confirm: {
        delete: 'Êtes-vous sûr de vouloir supprimer le bon de livraison {{number}} ? Cette action est irréversible.',
      },
      alerts: {
        deleteFailed: 'La suppression du bon de livraison a échoué',
        loadingError: 'Erreur lors du chargement des bons de livraison',
      }
    },
    invoiceDetails: {
      header: 'Détails de la facture',
      actions: { print: 'Imprimer', export: 'Exporter', email: 'E‑mail', edit: 'Modifier', delete: 'Supprimer', managePayment: 'Gérer le paiement' },
      export: { pdf: 'Exporter en PDF', csv: 'Exporter en CSV', itemsCsv: 'Exporter les articles CSV' }
    },
    invoiceForm: {
      header: { create: 'Créer une nouvelle facture', convert: 'Convertir le devis en facture' },
      sections: { customerVehicle: 'Informations client et véhicule', details: 'Détails de la facture', linkBL: 'Lier des bons de livraison', itemsPricing: 'Articles et tarification', summary: 'Résumé', additional: 'Informations complémentaires' },
      labels: { customer: 'Client *', vehicle: 'Véhicule *', issueDate: 'Date d’émission *', dueDate: 'Date d’échéance *', notes: 'Notes', terms: 'Conditions générales' },
      select: { selectCustomer: 'Sélectionner un client', selectVehicle: 'Sélectionner un véhicule' },
      linkBL: {
        help: 'Sélectionnez un ou plusieurs BL pour générer cette facture. Les BL déjà facturés sont exclus.',
        table: { select: 'Sélectionner', blNumber: 'N° BL', customer: 'Client', date: 'Date', amount: 'Montant', status: 'Statut' },
        none: 'Aucun bon de livraison disponible',
        actionCreate: 'Créer la facture à partir des BL sélectionnés'
      },
      items: {
        addItem: 'Ajouter un article',
        emptyText: 'Aucun article ajouté',
        addFirst: 'Ajouter le premier article',
        fields: {
          type: 'Type',
          typeOptions: { service: 'Service', part: 'Pièce', labor: 'Main d’œuvre', other: 'Autre' },
          category: 'Catégorie',
          categoryPlaceholder: 'Ex: Moteur, Injection, Distribution, Refroidissement…',
          description: 'Description *', descriptionPlaceholder: "Saisir la description de l'article",
          quantity: 'Quantité *', unitPrice: 'Prix unitaire *', discount: 'Remise (%)', total: 'Total',
          partNumber: 'Référence (optionnel)', partNumberPlaceholder: 'Saisir la référence'
        }
      },
      summary: { subtotal: 'Sous-total :', vat: 'TVA (20 %) :', total: 'Total :' },
      additional: { notesPlaceholder: 'Notes supplémentaires ou instructions particulières...', termsPlaceholder: 'Saisir les conditions générales...' },
      actions: { cancel: 'Annuler', create: 'Créer la facture', creating: 'Création…', print: 'Imprimer', export: 'Exporter' }
    },
    estimateForm: {
      header: {
        create: "Créer un nouveau devis",
        edit: "Modifier le devis"
      },
      sections: {
        customerVehicle: "Informations client et véhicule",
        details: "Détails du devis",
        itemsPricing: "Articles et tarification",
        summary: "Résumé",
        additional: "Informations complémentaires"
      },
      labels: {
        customer: "Client *",
        vehicle: "Véhicule *",
        issueDate: "Date d'émission *",
        expiryDate: "Date d'expiration *",
        notes: "Notes",
        terms: "Conditions générales"
      },
      select: {
        selectCustomer: "Sélectionner un client",
        selectVehicle: "Sélectionner un véhicule"
      },
      items: {
        addItem: "Ajouter un article",
        addFirst: "Ajouter le premier article",
        empty: "Aucun article ajouté",
        type: "Type",
        description: "Description *",
        quantity: "Quantité *",
        unitPrice: "Prix unitaire *",
        total: "Total",
        partNumber: "Référence (optionnel)",
        placeholders: {
          description: "Saisir la description",
          partNumber: "Saisir la référence"
        },
        types: {
          service: "Service",
          part: "Pièce",
          labor: "Main d'œuvre",
          other: "Autre"
        }
      },
      summary: {
        subtotal: "Sous-total :",
        vat: "TVA (20%) :",
        total: "Total :"
      },
      additional: {
        placeholders: {
          notes: "Notes supplémentaires ou instructions...",
          terms: "Saisir les conditions générales..."
        }
      },
      actions: {
        cancel: "Annuler",
        save: "Enregistrer le devis",
        saving: "Création...",
        print: "Imprimer",
        export: "Exporter"
      },
      defaults: {
        terms: "Paiement dû sous 30 jours. Tout travail est soumis à nos conditions générales standard."
      },
      errors: {
        customerRequired: "Le client est requis",
        vehicleRequired: "Le véhicule est requis",
        issueDateRequired: "La date d'émission est requise",
        expiryDateRequired: "La date d'expiration est requise",
        itemsRequired: "Au moins un article est requis",
        expiryDateAfterIssue: "La date d'expiration doit être postérieure à la date d'émission"
      }
    },
    invoicesList: {
      header: 'Factures',
      subtitle: 'Gérez vos factures et suivez les paiements',
      actions: { new: 'Nouvelle facture', view: 'Voir détails', edit: 'Modifier', recordPayment: 'Enregistrer un paiement', print: 'Imprimer', delete: 'Supprimer' },
      searchPlaceholder: 'Rechercher des factures...',
      filters: {
        statusOptions: { all: 'Tous statuts', draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard' },
        paymentOptions: { all: 'Tous les statuts de paiement', unpaid: 'Impayée', partial: 'Partiellement payée', paid: 'Payée' },
        dateOptions: { all: 'Toutes dates', today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois‑ci' },
        sortOptions: { newest: 'Plus récent d’abord', oldest: 'Plus ancien d’abord', highestAmount: 'Montant le plus élevé', lowestAmount: 'Montant le plus faible', payment: 'Statut de paiement', number: 'Numéro de facture' }
      },
      resultsCountPrefix: 'Affichage de',
      resultsCountMid: 'sur',
      resultsCountSuffix: 'factures',
      totalOutstanding: 'Total dû',
      empty: { title: 'Aucune facture trouvée', tipSearch: 'Essayez d’ajuster votre recherche ou vos filtres', tipCreate: 'Commencez en créant votre première facture', createFirst: 'Créer la première facture' },
      table: { invoiceNumber: 'N° de facture', customer: 'Client', vehicle: 'Véhicule', date: 'Date', amount: 'Montant', paymentStatus: 'Statut de paiement', dueDate: 'Échéance', actions: 'Actions', fromEstimatePrefix: 'Depuis :', customerIdPrefix: 'ID :', paidPrefix: 'Payé' },
      paymentStatusText: { unpaid: 'Impayée', partial: 'Partiellement payée', paid: 'Payée' },
      badge: { overdue: 'EN RETARD' }
    },
    estimatesList: {
      header: 'Devis',
      subtitle: 'Gérez vos devis et convertissez‑les en factures',
      actions: { new: 'Nouveau devis', view: 'Voir détails', edit: 'Modifier', convert: 'Convertir en facture', delete: 'Supprimer' },
      searchPlaceholder: 'Rechercher des devis...',
      filters: {
        statusOptions: { all: 'Tous statuts', draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré' },
        dateOptions: { all: 'Toutes dates', today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois‑ci' },
        sortOptions: { newest: 'Plus récent d’abord', oldest: 'Plus ancien d’abord', highestAmount: 'Montant le plus élevé', lowestAmount: 'Montant le plus faible', number: 'Numéro de devis' }
      },
      resultsCountPrefix: 'Affichage de',
      resultsCountMid: 'sur',
      resultsCountSuffix: 'devis',
      empty: { title: 'Aucun devis trouvé', tipSearch: 'Essayez d’ajuster votre recherche ou vos filtres', tipCreate: 'Commencez en créant votre premier devis', createFirst: 'Créer le premier devis' },
      table: { estimateNumber: 'N° de devis', customer: 'Client', vehicle: 'Véhicule', date: 'Date', status: 'Statut', amount: 'Montant', actions: 'Actions', customerIdPrefix: 'ID :' },
      expiry: { expired: 'Expiré', expiresOnPrefix: 'Expire le :' },
      statusText: { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré' }
    },
    estimateDetails: {
      titlePrefix: 'Devis',
      notFound: {
        title: 'Devis introuvable',
        message: 'Le devis demandé est introuvable ou a été supprimé.',
        backButton: 'Retour aux devis'
      },
      confirm: {
        delete: 'Êtes-vous sûr de vouloir supprimer ce devis ?',
        convertToJobOrder: 'Convertir ce devis en ordre de réparation ?',
        convertToInvoice: 'Convertir ce devis en facture ?'
      },
      statusLabels: {
        draft: 'Brouillon',
        sent: 'Envoyé',
        accepted: 'Accepté',
        rejected: 'Refusé'
      },
      status: {
        expired: 'Expiré',
        converted: 'Converti en facture'
      },
      actions: {
        convertToJobOrder: 'Convertir en ordre de réparation',
        convertToInvoice: 'Convertir en facture',
        print: 'Imprimer',
        export: 'Exporter',
        exportPdf: 'Exporter en PDF',
        exportCsv: 'Exporter en CSV',
        exportItemsCsv: 'Exporter les lignes en CSV',
        edit: 'Modifier',
        delete: 'Supprimer',
        updateStatus: 'Mettre à jour le statut',
        setStatus: {
          draft: 'Marquer comme brouillon',
          sent: 'Marquer comme envoyé',
          accepted: 'Marquer comme accepté',
          rejected: 'Marquer comme refusé'
        }
      },
      sections: {
        customer: 'Informations client',
        vehicle: 'Informations véhicule',
        items: 'Articles du devis',
        additional: 'Informations complémentaires'
      },
      fields: {
        name: 'Nom',
        customerId: 'ID client',
        makeModel: 'Marque et modèle',
        year: 'Année',
        vin: 'VIN',
        registration: 'Immatriculation',
        estimateNumber: 'Numéro de devis',
        issueDate: 'Date d’émission',
        expiryDate: 'Date d’expiration',
        convertedToInvoice: 'Converti en facture N°',
        notes: 'Notes',
        terms: 'Conditions générales'
      },
      table: {
        type: 'Type',
        description: 'Description',
        quantity: 'Quantité',
        unitPrice: 'Prix unitaire',
        total: 'Total'
      },
      summary: {
        subtotal: 'Sous-total',
        vat: 'TVA',
        total: 'Total TTC'
      }
    },
    common: { due: 'Échéance', today: 'Aujourd’hui', tomorrow: 'Demain', yesterday: 'Hier', unknown: 'Inconnu' },
    techPerformance: {
      title: 'Performance des techniciens',
      subtitle: 'Surveillez les indicateurs et la productivité par technicien',
      filters: {
        range: { today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois‑ci', custom: 'Personnalisé' },
        start: 'Date de début',
        end: 'Date de fin'
      },
      cards: { jobs: 'Travaux', billedHours: 'Heures facturées', workedHours: 'Heures travaillées', comebacks: 'Retours', revenue: 'Revenu' },
      table: { ranking: 'Classement', technician: 'Technicien', jobs: 'Travaux', billedHours: 'Heures facturées', workedHours: 'Heures travaillées', productivity: 'Productivité %', comebacks: 'Retours', revenue: 'Revenu' },
      detail: { titleSuffix: ' — Travaux', close: 'Fermer', vehicle: 'Véhicule', job: 'Travail', estHours: 'Heures estimées', actualHours: 'Heures réelles', laborAmount: 'Montant main d’œuvre', comeback: 'Retour', yes: 'Oui', no: 'Non' }
    },
    jobOrderForm: {
      header: { create: 'Créer un nouvel ordre de réparation', edit: 'Modifier l’ordre de réparation' },
      actions: { create: 'Créer l’ordre de réparation', update: 'Mettre à jour l’ordre de réparation' },
      sections: {
        customerVehicle: 'Informations client et véhicule',
        jobDetails: 'Détails de l’ordre',
        assignmentScheduling: 'Affectation et planification',
        additionalInfo: 'Informations complémentaires'
      },
      fields: {
        customer: { label: 'Client *', placeholder: 'Sélectionner un client' },
        vehicle: { label: 'Véhicule *', placeholder: 'Sélectionner un véhicule' },
        useAdvanced: 'Utiliser le système avancé de réparation',
        vehicleRepairTasks: 'Tâches de réparation du véhicule *',
        assignedMechanic: { label: 'Mécanicien assigné *', placeholder: 'Sélectionner un mécanicien' },
        notes: { label: 'Notes', placeholder: 'Notes ou instructions particulières...' }
      },
      labels: {
        overallTotal: 'Total de la commande',
        priorityLevel: 'Niveau de priorité',
        priorityIndicator: 'Indicateur de priorité',
        priority: 'Priorité',
        repairTasksAdded: 'tâches de réparation ajoutées'
      },
      tooltips: {
        hoursAutoCalc: 'Les heures estimées sont calculées à partir des tâches',
        costAutoCalc: 'Le coût estimé est calculé à partir des tâches'
      },
      errors: {
        customerRequired: 'Le client est requis',
        vehicleRequired: 'Le véhicule est requis',
        repairTaskRequired: 'Au moins une tâche de réparation est requise',
        laborOrPartRequired: 'Au moins un poste de main d’œuvre ou une pièce est requis',
        mechanicRequired: 'L’assignation du mécanicien est requise',
        hoursPositive: 'Les heures estimées doivent être supérieures à 0',
        deadlineRequired: 'L’échéance est requise',
        costNonNegative: 'Le coût estimé ne peut pas être négatif',
        deadlinePast: 'L’échéance ne peut pas être passée'
      }
    },
    partsSection: {
      title: 'Pièces détachées',
      addPart: 'Ajouter une pièce',
      selectPart: 'Sélectionner une pièce',
      customPart: 'Pièce personnalisée',
      fields: { name: 'Nom de la pièce', category: 'Catégorie', number: 'Référence', quantity: 'Quantité', unitPrice: 'Prix unitaire', discount: 'Remise (%)', description: 'Description' },
      table: { name: 'Nom de la pièce', category: 'Catégorie', number: 'Référence', quantity: 'Quantité', unitPrice: 'Prix unitaire', discount: 'R (%)', totalPrice: 'Total', actions: 'Actions' },
      empty: 'Aucune pièce ajoutée. Cliquez sur "Ajouter une pièce" pour commencer.',
      summary: { totalParts: 'Total pièces', totalCost: 'Coût total des pièces' },
      lookup: { price: 'Prix', stock: 'Stock', loading: 'Chargement...', noMatch: 'Aucun article de stock correspondant' }
    },
    laborSection: {
      title: 'Main d’œuvre',
      addTask: 'Ajouter une tâche',
      fields: { taskName: 'Nom de la tâche', category: 'Catégorie', technician: 'Technicien', hours: 'Heures', hourlyRate: 'Taux horaire', discount: 'Remise (%)' },
      table: { taskName: 'Nom de la tâche', category: 'Catégorie', technician: 'Technicien', hours: 'Heures', hourlyRate: 'Taux horaire', discount: 'R (%)', totalPrice: 'Total', actions: 'Actions' },
      empty: 'Aucune tâche de main d’œuvre ajoutée. Cliquez sur "Ajouter une tâche" pour commencer.',
      summary: { totalHours: 'Total heures de main d’œuvre', totalCost: 'Coût total de la main d’œuvre' }
    },
    deliveryNoteDetail: {
      header: { back: 'Retour à la liste', titlePrefix: 'Bon de livraison', issuedOn: 'Émis le' },
      invoiceLabel: 'Facture :',
      actions: { submit: 'Soumettre', edit: 'Modifier', finish: 'Terminer', approve: 'Approuver', reject: 'Rejeter', markDelivered: 'Marquer comme livré', cancel: 'Annuler', print: 'Imprimer', exportPdf: 'Exporter PDF', convertInvoice: 'Convertir en facture', addPart: 'Ajouter une pièce', add: 'Ajouter', close: 'Fermer' },
      sections: { customer: 'Informations client', vehicle: 'Informations véhicule', parts: 'Pièces détachées', labor: 'Main d’œuvre', documents: 'Références documentaires', signatures: 'Signatures', totals: 'Totaux' },
      table: { ref: 'Référence', description: 'Description', quantity: 'Quantité', unitPrice: 'Prix unitaire', total: 'Total', notes: 'Notes', actions: 'Actions', hours: 'Heures', hourlyRate: 'Taux horaire', technician: 'Technicien', relatedPart: 'Pièce liée' },
      empty: { noParts: 'Aucune pièce ajoutée à ce bon de livraison', noLabor: 'Aucune main d’œuvre ajoutée à ce bon de livraison' },
      totals: { parts: 'Sous‑total (pièces)', labor: 'Sous‑total (main d’œuvre)', subtotal: 'Sous‑total', vat: 'TVA (20%)', total: 'Total' }
    },
    status: {
      pending: 'En attente',
      inProgress: 'En cours',
      scheduled: 'Planifié',
      waitingParts: 'En attente de pièces',
      waitingApproval: 'En attente d’approbation',
      overdue: 'En retard',
      completed: 'Terminé',
      cancelled: 'Annulé',
      transferred: 'Transféré',
      paid: 'Payé'
    },
    dashboard: {
      title: 'Tableau de bord de gestion',
      subtitle: 'Bienvenue ! Voici ce qui se passe dans votre garage aujourd’hui.',
      recentJobs: 'Travaux récents',
      recentInvoices: 'Factures récentes'
    },
    garageDashboard: {
      title: 'État de l’atelier',
      subtitle: 'Vue en temps réel de tous les véhicules dans l’atelier',
      vehicleAssignment: 'Affectation des véhicules',
      vehicleAssignmentSubtitle: 'Gérez les emplacements et les statuts des véhicules dans le garage',
      vehicles: 'véhicules',
      day: 'jour',
      days: 'jours',
      grid: 'Grille',
      list: 'Liste',
      filters: 'Filtres',
      showNotes: 'Afficher notes',
      hideNotes: 'Masquer notes',
      button: { parts: 'Pièces', work: 'Travaux', done: 'Fait' },
      table: { vehicle: 'Véhicule', customer: 'Client', mechanic: 'Mécanicien', status: 'Statut', actions: 'Actions' },
      filtersPanel: { status: 'Statut', mechanic: 'Mécanicien', location: 'Emplacement', all: 'Tous', clear: 'Effacer les filtres' },
      locations: { bay1: 'Poste 1', bay2: 'Poste 2', bay3: 'Poste 3', bay4: 'Poste 4', outdoorBay: 'Extérieur' },
      unknownCustomer: 'Client inconnu'
    },
    user: { systemAdmin: 'Administrateur système' },
    settings: {
      header: 'Paramètres',
      subtitle: 'Configurez les paramètres de votre atelier et vos préférences',
      loading: 'Chargement...',
      configErrorTitle: 'Erreur de configuration',
      dismiss: 'Ignorer',
      savedSuccess: 'Paramètres enregistrés avec succès !',
      tabs: {
        workshop: { label: 'Détails de l’atelier', description: 'Configurez les informations de votre atelier, logo et horaires' },
        taxes: { label: 'Taux de taxe', description: 'Configurez les taux de taxe et règles d’application' },
        jobTypes: { label: 'Types de travaux', description: 'Définissez les catégories de service et la tarification' },
        backup: { label: 'Sauvegarde et restauration', description: 'Gérez les sauvegardes et la restauration des données' },
        templates: { label: 'Modèles de documents', description: 'Personnalisez les modèles de devis, factures et reçus' }
      },
      currency: {
        title: 'Devise de l’application',
        label: 'Devise de l’application',
        option: { MAD: 'MAD — Dirham marocain', EUR: 'EUR — Euro', USD: 'USD — Dollar américain' },
        save: 'Valider',
        saving: 'En attente...',
        cancel: 'Annuler',
        savedToast: 'Préférence de devise enregistrée',
        formatNote: 'Formatage : {locale}. Les valeurs s’affichent dans la devise sélectionnée ; des taux de change peuvent être appliqués.'
      },
      language: {
        title: 'Langue de l’application',
        label: 'Langue de l’interface',
        option: { en: 'Anglais (English)', fr: 'Français' },
        save: 'Enregistrer la langue',
        saving: 'Enregistrement...',
        cancel: 'Réinitialiser',
        savedToast: 'Préférence de langue enregistrée'
      },
      quickActions: {
        title: 'Actions rapides',
        workshop: { title: 'Mettre à jour l’atelier', desc: 'Nom, adresse, coordonnées' },
        taxes: { title: 'Configurer les taxes', desc: 'Taux de taxe et règles d’application' },
        jobTypes: { title: 'Gérer les types de travaux', desc: 'Catégories de service et tarification' },
        templates: { title: 'Personnaliser les modèles', desc: 'Apparence et mise en page des documents' }
      },
      workshop: {
        basicInfo: 'Informations de base',
        logo: 'Logo de l’atelier',
        uploadLogo: 'Télécharger le logo',
        logoNote: 'PNG, JPG jusqu’à 5 Mo',
        name: 'Nom de l’atelier *',
        namePlaceholder: 'Saisir le nom de l’atelier',
        taxId: 'Identifiant fiscal/TIN',
        taxIdPlaceholder: 'XX‑XXXXXXX',
        address: 'Adresse *',
        addressPlaceholder: 'Saisir l’adresse complète',
        phone: 'Téléphone *',
        phonePlaceholder: '(555) 123‑4567',
        email: 'E‑mail *',
        emailPlaceholder: 'atelier@example.com',
        website: 'Site web',
        websitePlaceholder: 'https://www.exemple.com',
        businessHours: 'Horaires',
        openTime: 'Ouverture',
        closeTime: 'Fermeture',
        breakStart: 'Début de pause',
        breakEnd: 'Fin de pause',
        social: 'Réseaux sociaux',
        saving: 'Enregistrement…',
        save: 'Enregistrer les paramètres de l’atelier'
      },
      morocco: {
        title: 'Informations légales (Maroc)',
        if: 'IF (Identifiant Fiscal)',
        ice: 'ICE (Identifiant Commun de l’Entreprise)',
        rib: 'RIB (Relevé d’Identité Bancaire)',
        patent: 'Patente (Licence)',
        ifPlaceholder: 'ex. 12345678',
        icePlaceholder: '15 chiffres',
        ribPlaceholder: '24 chiffres',
        patentPlaceholder: 'ex. 123456',
        ribNote: 'Le RIB est stocké de façon sécurisée et masqué par défaut.',
        securityNote: 'Les données sensibles sont visibles uniquement pour les utilisateurs autorisés ; masquées en vue générale.',
        notSet: 'Non renseigné',
        errors: {
          if: 'L’IF doit comporter 6 à 8 chiffres',
          ice: 'L’ICE doit comporter 15 chiffres',
          rib: 'Le RIB doit comporter 20 à 24 chiffres',
          patent: 'La patente doit comporter 5 à 7 chiffres'
        }
      }
    },
    inventory: { title: 'Gestion de stock', tab: { inventory: 'Articles de stock', purchaseOrders: 'Bons de commande', returns: 'Avoirs', supplierInvoices: 'Factures fournisseur', suppliers: 'Fournisseurs' } },
    inventoryDashboard: {
      title: 'Tableau de stock', subtitle: 'Vue d’ensemble du système de gestion de stock', actions: { viewShipmentHistory: 'Voir l’historique des expéditions', manageInventory: 'Gérer le stock' },
      metrics: { totalItems: 'Articles totaux', totalValue: 'Valeur totale du stock', lowStockItems: 'Articles en faible stock', outOfStock: 'Rupture de stock' },
      supplierOverview: { title: 'Vue des fournisseurs', totalSuppliers: 'Fournisseurs totaux', activeSuppliers: 'Fournisseurs actifs' },
      purchaseOrders: { title: 'Bons de commande', totalOrders: 'Commandes totales', pendingOrders: 'Commandes en attente' },
      itemsByCategory: { title: 'Articles par catégorie' },
      outOfStockItems: { title: 'Articles en rupture', badge: 'Rupture de stock' },
      recentMovements: { title: 'Mouvements de stock récents' },
      categories: {
        engine_parts: 'Pièces moteur',
        brakes: 'Freinage',
        suspension: 'Suspension',
        electrical: 'Électricité',
        body_parts: 'Carrosserie',
        fluids: 'Fluides',
        tools: 'Outils',
        consumables: 'Consommables',
        safety_equipment: 'Équipements de sécurité',
        other: 'Autres',
        parts: 'Pièces',
        tires_and_wheels: 'Pneus et roues',
        brake_system: 'Système de freinage'
      },
      unknownItem: 'Article inconnu'
    },
    inventoryManagement: {
      tabs: { 
        inventory: 'Articles de stock', 
        purchaseOrders: 'Bons de commande', 
        returns: 'Retours', 
        supplierInvoices: 'Factures fournisseur', 
        supplierPayments: 'Règlements fournisseurs', 
        suppliers: 'Fournisseurs'
      },
      searchPlaceholder: 'Rechercher par SKU, nom, catégorie, fournisseur...',
      actions: { filters: 'Filtres', scan: 'Scanner', export: 'Exporter', addItem: 'Ajouter un article', dismissAll: 'Tout ignorer' },
      shipmentHistory: {
        title: 'Historique des expéditions et mouvements de stock',
        actions: { close: 'Fermer' },
        filters: {
          searchPlaceholder: 'Rechercher des articles ou des fournisseurs...',
          type: {
            all: 'Tous les types',
            purchase: 'Achats',
            sale: 'Ventes',
            adjustment: 'Ajustements',
            return: 'Retours',
            transfer: 'Transferts',
            receive: 'Réceptions',
            issue: 'Sorties'
          },
          date: { all: 'Toute la période', today: 'Aujourd’hui', week: '7 derniers jours', month: '30 derniers jours' }
        },
        types: {
          purchase: 'Achat',
          sale: 'Vente',
          adjustment: 'Ajustement',
          return: 'Retour',
          transfer: 'Transfert',
          receive: 'Réception',
          issue: 'Sortie'
        },
        empty: {
          title: 'Aucun mouvement de stock trouvé',
          adjustFilters: 'Essayez de modifier votre recherche ou vos filtres.',
          noMovements: 'Aucun mouvement de stock n’a encore été enregistré.'
        },
        fields: {
          sku: 'SKU',
          supplier: 'Fournisseur',
          quantity: 'Quantité',
          reference: 'Référence',
          notes: 'Notes',
          stock: 'Stock',
          na: 'N/A'
        }
      },
      alerts: {
        stockAlerts: 'Alertes de stock',
        markResolved: 'Marquer comme résolu',
        dismissAlert: 'Ignorer l’alerte',
        title: 'Alertes de stock',
        emptyTitle: 'Aucune alerte de stock',
        emptyDescription: 'Tous les articles d’inventaire sont suffisamment approvisionnés.',
        lowStockPrefix: 'Stock faible :',
        outOfStockPrefix: 'Rupture de stock :',
        remainingSuffix: 'restants',
        summaryOutOfStock: 'Ruptures de stock',
        summaryLowStock: 'Stocks faibles',
        summaryTotalAlerts: 'Alertes totales',
        close: 'Fermer'
      },
      filtersPanel: { category: 'Catégorie', supplier: 'Fournisseur', location: 'Emplacement', stockLevel: 'Niveau de stock', allItems: 'Tous les articles', inStock: 'En stock', lowStock: 'Faible stock', outOfStock: 'Rupture de stock', overstock: 'Surstock', clearAll: 'Effacer tous les filtres', showing: 'Affichage' },
      table: { columns: { skuCode: 'SKU/Code', name: 'Nom', category: 'Catégorie', quantity: 'Quantité', unit: 'Unité', minStock: 'Stock min', location: 'Emplacement', supplier: 'Fournisseur', purchasePrice: 'Prix d’achat', salePrice: 'Prix de vente', taxRate: 'Taux de taxe', lastUpdated: 'Dernière mise à jour', actions: 'Actions' }, badgeOut: 'RUPTURE' },
      empty: { noItems: 'Aucun article correspondant à vos critères.', clearFilters: 'Effacer les filtres', showAll: 'Afficher tous les articles' },
      actionsTitles: { stockIn: 'Entrée de stock', stockOut: 'Sortie de stock', transferStock: 'Transférer le stock', viewHistory: 'Voir l’historique', whereUsed: 'Où utilisé', editItem: 'Modifier l’article', cannotDeleteWithStock: 'Impossible de supprimer un article avec stock', deleteItem: 'Supprimer l’article' }
    },
    customerManagement: {
      list: {
        header: 'Gestion des clients',
        subtitle: 'Gérez vos clients et leurs véhicules',
        addCustomer: 'Ajouter un client',
        searchPlaceholder: 'Rechercher par nom, e‑mail, téléphone, carte de fidélité ou véhicule...',
        searchButton: 'Rechercher',
        stats: {
          totalCustomers: 'Clients au total',
          totalVehicles: 'Véhicules au total',
          loyaltyMembers: 'Clients fidélité'
        },
        empty: {
          title: 'Aucun client trouvé',
          description: 'Modifiez vos termes de recherche ou ajoutez un nouveau client'
        },
        buttons: {
          viewDetails: 'Voir les détails',
          editCustomer: 'Modifier le client',
          deleteCustomer: 'Supprimer le client'
        },
        confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.'
      },
      shared: {
        contactPrefix: 'Contact :',
        icePrefix: 'ICE :',
        loyaltyPrefix: 'Fidélité :',
        vehicleSingular: 'véhicule',
        vehiclePlural: 'véhicules'
      },
      detail: {
        backToList: 'Retour à la liste des clients',
        editCustomer: 'Modifier le client',
        stats: {
          vehicles: 'Véhicules',
          serviceRecords: 'Interventions',
          invoices: 'Factures',
          totalSpent: 'Total dépensé'
        },
        contact: {
          title: 'Informations de contact',
          contactPerson: 'Personne de contact',
          email: 'E‑mail',
          phone: 'Téléphone',
          address: 'Adresse',
          loyaltyCard: 'Carte de fidélité'
        },
        account: {
          title: 'Informations de compte',
          customerSince: 'Client depuis',
          totalSpent: 'Total dépensé',
          totalVehicles: 'Véhicules au total'
        },
        notes: 'Notes',
        toasts: {
          vehicleExistsTitle: 'Véhicule déjà existant',
          vehicleExistsDescription: 'Un véhicule avec ce VIN ou cette immatriculation existe déjà pour ce client.',
          vehicleAddSuccessTitle: 'Véhicule ajouté avec succès',
          vehicleAddSuccessSuffix: 'a été ajouté au profil du client.',
          vehicleAddErrorTitle: 'Échec de l’ajout du véhicule',
          vehicleAddErrorDescription: 'Une erreur est survenue lors de l’ajout du véhicule. Veuillez réessayer.',
          vehicleUpdateSuccessTitle: 'Véhicule mis à jour avec succès',
          vehicleUpdateSuccessDescription: 'Les détails du véhicule ont été mis à jour.',
          vehicleUpdateErrorTitle: 'Échec de la mise à jour du véhicule',
          vehicleUpdateErrorDescription: 'Une erreur est survenue lors de la mise à jour du véhicule. Veuillez réessayer.',
          vehicleDeleteConfirmPrefix: 'Êtes-vous sûr de vouloir supprimer',
          vehicleDeleteConfirmSuffix: ' ? Cela supprimera aussi son historique de service et ses factures.',
          vehicleDeleteSuccessTitle: 'Véhicule supprimé avec succès',
          vehicleDeleteSuccessSuffix: 'a été supprimé du profil du client.',
          vehicleDeleteErrorTitle: 'Échec de la suppression du véhicule',
          vehicleDeleteErrorDescription: 'Une erreur est survenue lors de la suppression du véhicule. Veuillez réessayer.'
        }
      }
    },
    userManagement: {
      settingsTab: {
        label: 'Gestion des utilisateurs',
        description: 'Gérez les utilisateurs du système et les accès'
      },
      header: {
        title: 'Gestion des utilisateurs',
        subtitle: 'Gérez les utilisateurs du système, leurs rôles et leurs accès',
        addUser: 'Ajouter un utilisateur'
      },
      search: {
        placeholder: 'Rechercher des utilisateurs par nom, e‑mail ou rôle...'
      },
      table: {
        user: 'Utilisateur',
        role: 'Rôle',
        status: 'Statut',
        lastLogin: 'Dernière connexion',
        actions: 'Actions'
      },
      status: {
        active: 'Actif',
        inactive: 'Inactif',
        never: 'Jamais'
      },
      list: {
        loading: 'Chargement des utilisateurs...',
        empty: 'Aucun utilisateur ne correspond à « {{search}} »'
      },
      buttons: {
        viewPermissions: 'Voir les permissions',
        editDetails: 'Modifier les détails',
        resetPassword: 'Réinitialiser le mot de passe',
        deactivate: 'Désactiver',
        activate: 'Activer',
        deleteUser: 'Supprimer l’utilisateur'
      },
      form: {
        createTitle: 'Créer un nouvel utilisateur',
        editTitle: 'Modifier l’utilisateur',
        createSubtitle: 'Ajouter un nouvel utilisateur au système',
        editSubtitle: 'Mettre à jour les informations de l’utilisateur',
        fields: {
          username: 'Nom d’utilisateur *',
          email: 'E‑mail *',
          firstName: 'Prénom *',
          lastName: 'Nom *',
          role: 'Rôle *',
          password: 'Mot de passe *',
          confirmPassword: 'Confirmer le mot de passe *',
          passwordPlaceholder: 'Minimum 6 caractères',
          activeAccount: 'Compte actif'
        },
        roleOptions: {
          admin: 'Administrateur',
          supervisor: 'Superviseur',
          mechanic: 'Mécanicien',
          cashier: 'Caissier',
          template_admin: 'Administrateur de modèles',
          template_viewer: 'Consultant de modèles'
        },
        roleDescriptions: {
          admin: 'Accès complet au système et à la gestion des utilisateurs',
          supervisor: 'Gérer les opérations, ordres de réparation et rapports',
          mechanic: 'Travailler sur les ordres et créer des devis',
          cashier: 'Gérer le service client et la facturation',
          template_admin: 'Créer et gérer les modèles de documents',
          template_viewer: 'Consulter et utiliser les modèles de documents',
          default: 'Rôle utilisateur standard'
        },
        buttons: {
          cancel: 'Annuler',
          createUser: 'Créer l’utilisateur',
          updateUser: 'Mettre à jour l’utilisateur'
        }
      },
      validation: {
        usernameRequired: 'Le nom d’utilisateur est requis',
        usernameMin: 'Minimum 3 caractères',
        emailRequired: 'L’e‑mail est requis',
        emailInvalid: 'Adresse e‑mail invalide',
        firstNameRequired: 'Le prénom est requis',
        lastNameRequired: 'Le nom est requis',
        passwordRequired: 'Le mot de passe est requis',
        passwordMin: 'Minimum 6 caractères',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
        usernameExists: 'Ce nom d’utilisateur existe déjà',
        emailExists: 'Cet e‑mail est déjà utilisé'
      },
      toasts: {
        loadFailed: 'Échec du chargement des utilisateurs',
        invalidAdminPassword: 'Mot de passe administrateur incorrect',
        userDeleted: 'Utilisateur supprimé',
        userStatusUpdated: 'Statut de l’utilisateur mis à jour',
        actionFailed: 'L’action a échoué',
        userUpdated: 'Utilisateur mis à jour avec succès',
        userCreated: 'Utilisateur créé avec succès',
        saveFailed: 'Échec de l’enregistrement de l’utilisateur',
        passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
        passwordResetSuccess: 'Mot de passe réinitialisé pour {{username}}'
      },
      rolePermissions: {
        titleSuffix: ' — AUTORISATIONS'
      },
      confirmation: {
        title: 'Vérification de sécurité',
        intro: 'Vous êtes sur le point de',
        sensitiveNote: 'Ceci est une action sensible. Veuillez entrer votre mot de passe administrateur pour confirmer.',
        adminPasswordPlaceholder: 'Mot de passe administrateur',
        cancel: 'Annuler',
        confirm: 'Confirmer l’action',
        descriptions: {
          deleteUser: 'supprimer l’utilisateur « {{username}} »',
          deactivateUser: 'désactiver l’utilisateur « {{username}} »',
          activateUser: 'activer l’utilisateur « {{username}} »'
        }
      },
      passwordReset: {
        title: 'Réinitialiser le mot de passe utilisateur',
        descriptionPrefix: 'Définir un nouveau mot de passe pour l’utilisateur',
        newPasswordLabel: 'Nouveau mot de passe utilisateur',
        newPasswordPlaceholder: 'Minimum 6 caractères',
        adminVerificationLabel: 'Vérification administrateur',
        adminPasswordPlaceholder: 'Votre mot de passe administrateur',
        cancel: 'Annuler',
        confirm: 'Confirmer'
      }
    },
    userProfile: {
      header: {
        myProfile: 'Mon profil',
        userProfile: 'Profil utilisateur'
      },
      buttons: {
        editProfile: 'Modifier le profil',
        changePassword: 'Changer le mot de passe',
        activityLog: 'Journal d’activité',
        cancel: 'Annuler',
        saveChanges: 'Enregistrer les modifications',
        saving: 'Enregistrement...',
        changing: 'Modification...',
        changePasswordAction: 'Changer le mot de passe'
      },
      fields: {
        username: "Nom d’utilisateur",
        firstName: 'Prénom',
        lastName: 'Nom',
        email: 'E‑mail',
        role: 'Rôle',
        accountStatus: 'Statut du compte',
        lastLogin: 'Dernière connexion',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmNewPassword: 'Confirmer le nouveau mot de passe'
      },
      status: {
        active: 'Actif',
        inactive: 'Inactif',
        never: 'Jamais'
      },
      validation: {
        firstNameRequired: 'Le prénom est requis',
        lastNameRequired: 'Le nom est requis',
        emailRequired: 'L’e‑mail est requis',
        emailInvalid: 'Veuillez saisir une adresse e‑mail valide',
        currentPasswordRequired: 'Le mot de passe actuel est requis',
        newPasswordRequired: 'Le nouveau mot de passe est requis',
        newPasswordMin: 'Le mot de passe doit contenir au moins 6 caractères',
        passwordMismatch: 'Les mots de passe ne correspondent pas'
      },
      messages: {
        loadProfile: 'Chargement du profil utilisateur...',
        updateFailed: 'Échec de la mise à jour du profil. Veuillez réessayer.',
        changePasswordFailed: 'Échec du changement de mot de passe. Veuillez réessayer.',
        changePasswordSuccess: 'Mot de passe modifié avec succès.'
      },
      activity: {
        header: 'Journal d’activité',
        empty: 'Aucune activité récente trouvée.'
      }
    },
    userActivityLog: {
      header: {
        title: 'Journal d’activité des utilisateurs',
        subtitle: 'Surveillez les activités des utilisateurs et les événements système',
        forUserPrefix: 'pour'
      },
      buttons: {
        refresh: 'Actualiser',
        export: 'Exporter',
        exportJson: 'Exporter (JSON)',
        clearLog: 'Vider le journal'
      },
      filters: {
        searchLabel: 'Recherche',
        searchPlaceholder: 'Rechercher des activités...',
        userLabel: 'Utilisateur',
        allUsers: 'Tous les utilisateurs',
        actionLabel: 'Type d’action',
        allActions: 'Toutes les actions',
        dateRangeLabel: 'Période'
      },
      list: {
        loading: 'Chargement des activités...',
        empty: 'Aucune activité ne correspond à vos critères.',
        summary: 'Affichage de {{shown}} sur {{total}} activités',
        lastUpdatedPrefix: 'Dernière mise à jour :'
      },
      csv: {
        headerTimestamp: 'Horodatage',
        headerUser: 'Utilisateur',
        headerAction: 'Action',
        headerDetails: 'Détails',
        headerIp: 'Adresse IP',
        filenamePrefix: 'activites-utilisateurs-'
      },
      confirm: {
        clearTitle: 'Confirmation',
        clearMessage: 'Êtes-vous sûr de vouloir vider le journal d’activité ? Cette action est irréversible.'
      },
      details: {
        label: 'Détails'
      }
    },
    po: { header: 'Bons de commande', create: 'Créer un bon de commande', searchPlaceholder: 'Rechercher des bons de commande...', status: { pending: 'En attente', approved: 'Approuvé', ordered: 'Commandé', received: 'Réceptionné', cancelled: 'Annulé' }, noOrders: 'Aucun bon de commande', delete: 'Supprimer' },
    jobOrders: {
      title: 'Ordres de réparation', subtitle: 'Gérez les réparations et suivez leur avancement', new: 'Nouvel ordre de réparation',
      stats: { total: 'Total ordres', completed: 'Terminées', inProgress: 'En cours', overdue: 'En retard' },
      searchPlaceholder: 'Rechercher par numéro, client, véhicule ou description...', searchButton: 'Rechercher',
      filters: { allStatus: 'Tous statuts', allPriority: 'Toutes priorités', urgent: 'Urgent', high: 'Élevée', medium: 'Moyenne', low: 'Faible' },
      labels: { deadline: 'Échéance', estHours: 'Heures estimées', estCost: 'Coût estimé', unknownMechanic: 'Non assigné' },
      tooltips: { view: "Voir l'ordre de réparation", edit: "Modifier l'ordre de réparation", viewDetails: 'Voir détails' },
      empty: { title: 'Aucun ordre de réparation', subtitle: 'Modifiez vos termes de recherche ou filtres' },
      badges: { overdue: 'EN RETARD' }
    },
    persistence: { persisted: 'Persisté' },
    poManagement: {
      cards: { totalPOs: 'Total BDC', pendingOrders: 'Commandes en attente', overdueOrders: 'Commandes en retard', totalValue: 'Valeur totale' },
      searchPlaceholder: 'Rechercher par numéro BDC, fournisseur, référence...',
      actions: { filters: 'Filtres', newPO: 'Nouveau BDC', receive: 'Réceptionner' },
      alerts: { overdueTitle: 'Commandes en retard' },
      table: { columns: { poNumber: 'Numéro BDC', supplier: 'Fournisseur', orderDate: 'Date de commande', expectedDelivery: 'Livraison prévue', status: 'Statut', items: 'Articles', totalAmount: 'Montant total', actions: 'Actions' }, itemsCountSuffix: 'articles', receivedSuffix: 'reçus' },
      tooltips: { viewDetails: 'Voir détails', markSent: 'Marquer comme envoyé', receiveItems: 'Réceptionner les articles', printPO: 'Imprimer le BDC', emailPO: 'Envoyer le BDC par e‑mail', exportPO: 'Exporter le BDC', editPO: 'Modifier le BDC', deletePO: 'Supprimer le BDC', cancelPO: 'Annuler le BDC', removeItem: 'Supprimer l’article', changeStatus: 'Changer le statut' },
      empty: { noPOs: 'Aucun bon de commande trouvé', adjustFilters: 'Modifiez vos termes de recherche ou filtres' },
      detail: { title: 'Détails du bon de commande', orderInfo: 'Informations de commande', supplierInfo: 'Informations fournisseur', orderNumber: 'Numéro de commande', reference: 'Référence', expectedDelivery: 'Livraison prévue', paymentTerms: 'Conditions de paiement', contact: 'Contact', itemsTitle: 'Articles de commande', subtotal: 'Sous‑total', tax: 'Taxe', shipping: 'Livraison', total: 'Total', notes: 'Notes' },
      statusText: { draft: 'Brouillon', pending: 'En attente', sent: 'Envoyé', confirmed: 'Confirmé', partially_received: 'Partiellement reçu', received: 'Reçu', cancelled: 'Annulé' },
      modal: {
        createTitle: 'Créer un nouveau bon de commande',
        editTitle: 'Modifier le bon de commande',
        supplier: 'Fournisseur *',
        selectSupplier: 'Sélectionner un fournisseur',
        expectedDate: 'Date de livraison prévue',
        reference: 'Référence fournisseur',
        notes: 'Notes',
        items: 'Articles',
        addItem: 'Ajouter un article',
        item: 'Article',
        quantity: 'Quantité',
        unitCost: 'Coût unitaire',
        cancel: 'Annuler',
        create: 'Créer BDC',
        update: 'Mettre à jour BDC',
        validation: {
          supplierRequired: 'Veuillez sélectionner un fournisseur et ajouter au moins un article'
        },
        success: {
          created: 'Bon de commande créé avec succès',
          updated: 'Bon de commande mis à jour avec succès'
        },
        error: {
          save: 'Erreur lors de l\'enregistrement du bon de commande : {{error}}'
        }
      }
    },
    returnsManagement: {
      cards: { totalReturns: 'Retours totaux', pending: 'En attente', completed: 'Terminées', totalValue: 'Valeur totale' },
      searchPlaceholder: 'Rechercher des retours...',
      filters: {
        statusLabel: 'Statut',
        supplierLabel: 'Fournisseur',
        reasonLabel: 'Motif',
        allStatus: 'Tous statuts',
        allSuppliers: 'Tous les fournisseurs',
        allReasons: 'Tous motifs',
        statusOptions: { requested: 'Demandé', approved: 'Approuvé', processed: 'Traité', completed: 'Terminé', cancelled: 'Annulé', rejected: 'Rejeté' },
        reasonOptions: { defective: 'Défectueux', damaged: 'Endommagé', wrong_item: 'Article erroné', excess_inventory: 'Surstock', expired: 'Expiré', quality_issue: 'Problème de qualité', incorrect_order: 'Commande incorrecte', other: 'Autre' }
      },
      viewToggle: { list: 'Liste', grid: 'Grille' },
      actions: { export: 'Exporter', newReturn: 'Nouveau retour', processReturn: 'Traiter le retour' },
      table: { columns: { returnOrder: 'Bon de retour', supplier: 'Fournisseur', reason: 'Motif', status: 'Statut', items: 'Articles', amount: 'Montant', actions: 'Actions' }, itemsCountSuffix: 'articles', none: 'Aucun' },
      statusText: { REQUESTED: 'DEMANDÉ', APPROVED: 'APPROUVÉ', PROCESSED: 'TRAITÉ', COMPLETED: 'TERMINÉ', CANCELLED: 'ANNULÉ', REJECTED: 'REJETÉ' },
      tooltips: { viewDetails: 'Voir détails', delete: 'Supprimer' }
    },
    supplierInvoiceManagement: {
      header: 'Factures fournisseur',
      subtitle: 'Gérez les factures fournisseur et le suivi des paiements',
      actions: { newInvoice: 'Nouvelle facture' },
      cards: { totalInvoices: 'Total factures', paid: 'Payées', overdue: 'En retard', outstanding: 'Restant dû' },
      searchPlaceholder: 'Rechercher des factures...',
      filters: {
        statusLabel: 'Statut',
        paymentStatusLabel: 'Paiement',
        supplierLabel: 'Fournisseur',
        dateRangeLabel: 'Période',
        clear: 'Effacer',
        statusOptions: { all: 'Tous statuts', draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', partially_paid: 'Partiellement payée', overdue: 'En retard', cancelled: 'Annulée', disputed: 'Contestée' },
        paymentOptions: { all: 'Tous paiements', unpaid: 'Impayée', partially_paid: 'Partiellement payée', paid: 'Payée', overdue: 'En retard' },
        dateOptions: { all: 'Toute période', today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois' },
        supplierOptions: { all: 'Tous les fournisseurs' }
      },
      table: { columns: { invoiceNumber: 'Facture #', supplier: 'Fournisseur', date: 'Date', dueDate: 'Échéance', amount: 'Montant', relatedPOs: 'BDC liés', status: 'Statut', payment: 'Paiement', actions: 'Actions' } },
      badges: { status: { DRAFT: 'BROUILLON' }, payment: { UNPAID: 'IMPAYÉE', PARTIALLY_PAID: 'PARTIELLEMENT PAYÉE', PAID: 'PAYÉE', OVERDUE: 'EN RETARD' } },
      tooltips: { viewDetails: 'Voir détails', editInvoice: 'Modifier la facture', deleteInvoice: 'Supprimer la facture' }
    },
    supplierManagement: {
      header: 'Gestion des fournisseurs',
      subtitle: 'Gérez vos relations fournisseurs et suivez les dépenses',
      actions: { addSupplier: 'Ajouter un fournisseur', managePayments: 'Gérer les règlements' },
      searchPlaceholder: 'Rechercher des fournisseurs...',
      filters: { allStatus: 'Tous statuts', active: 'Actif', inactive: 'Inactif', sortByName: 'Trier par nom', sortBySpending: 'Trier par dépenses', sortByRating: 'Trier par note', sortByDate: 'Trier par date' },
      showing: 'Affichage',
      listView: 'Vue liste',
      gridView: 'Vue grille',
      metrics: { totalSpending: 'Dépenses totales', openOrders: 'Commandes ouvertes' },
      table: { columns: { supplier: 'Fournisseur', contact: 'Contact', location: 'Localisation', status: 'Statut', totalSpending: 'Dépenses totales', ordersInvoices: 'Commandes/Factures', actions: 'Actions' } },
      statusText: { active: 'Actif', inactive: 'Inactif' },
      modal: {
        addTitle: 'Ajouter un nouveau fournisseur',
        editTitle: 'Modifier le fournisseur',
        cancel: 'Annuler',
        submit: 'Ajouter le fournisseur',
        update: 'Mettre à jour le fournisseur',
        sections: { basicInfo: 'Informations de base', addressInfo: 'Adresse', businessInfo: 'Informations commerciales', notes: 'Notes' },
        fields: {
          supplierName: { label: 'Nom du fournisseur', placeholder: 'Saisir le nom du fournisseur' },
          contactPerson: { label: 'Personne de contact', placeholder: 'Saisir le nom du contact' },
          email: { label: 'Email', placeholder: 'Saisir l’adresse e‑mail' },
          phone: { label: 'Téléphone', placeholder: 'Saisir le numéro de téléphone' },
          address: { label: 'Adresse', placeholder: 'Saisir l’adresse' },
          city: { label: 'Ville', placeholder: 'Saisir la ville' },
          postcode: { label: 'Code postal', placeholder: 'Saisir le code postal' },
          country: { label: 'Pays', placeholder: 'Saisir le pays' },
          paymentTerms: { label: 'Conditions de paiement', placeholder: 'ex. Net 30, COD' },
          currency: { label: 'Devise', placeholder: 'ex. USD, EUR' },
          taxId: { label: 'Identifiant fiscal', placeholder: 'Saisir l’identifiant fiscal' },
          website: { label: 'Site web', placeholder: 'https://exemple.com' },
          deliveryTime: { label: 'Délai de livraison (jours)', placeholder: 'Saisir le délai moyen' },
          minOrderValue: { label: 'Valeur minimale de commande', placeholder: 'Saisir la valeur minimale' },
          notes: { label: 'Notes', placeholder: 'Saisir des notes supplémentaires...' }
        }
      }
    },
    deliveryNotesList: {
      header: 'Bons de livraison',
      subtitle: 'Gérez vos bons de livraison et suivez le statut des livraisons',
      actions: { generateFromJobs: 'Générer depuis les ordres de réparation', createNew: 'Créer un bon de livraison', view: 'Voir', inspectData: 'Inspecter les données', reconcile: 'Réconcilier', edit: 'Modifier', delete: 'Supprimer', save: 'Enregistrer', cancel: 'Annuler' },
      confirm: { deleteTitle: 'Supprimer le bon de livraison', deleteText: 'Ceci va supprimer (soft delete) le BL. Continuer ?', confirm: 'Confirmer', cancel: 'Annuler' },
      filters: { searchPlaceholder: 'Rechercher par numéro BL, client, véhicule...', statusLabel: 'Statut', all: 'Tous statuts', draft: 'Brouillon', issued: 'Émis', delivered: 'Livré', cancelled: 'Annulé' },
      empty: { title: 'Aucun bon de livraison', searchNoResults: 'Aucun résultat ne correspond à votre recherche', chooseMethod: 'Choisissez une méthode de création pour commencer' },
      cards: { blPrefix: 'N° ', partsSingular: 'pièce', partsPlural: 'pièces', total: 'Total', invoicePrefix: 'Facture :' },
      summary: { totalNotes: 'Total BL', issued: 'Émis', delivered: 'Livré', totalValue: 'Valeur totale' },
      jobPicker: {
        title: 'Sélectionner des ordres de réparation',
        close: 'Fermer',
        searchPlaceholder: 'Rechercher par numéro, client, véhicule...',
        statusFilter: { all: 'Tous statuts' },
        table: { select: 'Sélection', jobNumber: 'N° OR', customer: 'Client', vehicle: 'Véhicule', priority: 'Priorité', status: 'Statut', created: 'Créé le' },
        empty: 'Aucun ordre de réparation disponible',
        selected: 'Sélectionnés : {{count}}',
        actions: { cancel: 'Annuler', confirm: 'Confirmer la sélection' },
        aria: { selectJob: 'Sélectionner l’ordre {{jobNumber}}' },
        errors: {
          missingJobNumber: 'Numéro d’ordre manquant',
          missingCustomerId: 'ID client manquant',
          missingCustomerName: 'Nom du client manquant',
          missingVehicleInfo: 'Informations véhicule manquantes',
          invalidStatus: 'Le statut de l’ordre doit être Approuvé ou Terminé',
          notApproved: 'Ordre non approuvé'
        }
      },
      validation: {
        title: 'Résultats de validation',
        close: 'Fermer',
        ok: 'OK',
        failed: 'Échec',
        actions: { cancel: 'Annuler', proceed: 'Continuer' },
        toastFailed: 'Validation échouée. Corrigez les erreurs avant de créer les bons de livraison.',
        toastCreated: '{{count}} bon(s) de livraison créé(s)'
      },
      statusText: { draft: 'Brouillon', issued: 'Émis', delivered: 'Livré', cancelled: 'Annulé' }
    },
    backupManager: {
      createSection: {
        title: 'Créer une sauvegarde',
        description: 'Téléchargez une copie de vos données sur votre appareil.',
        encrypt: 'Chiffrer le fichier de sauvegarde',
        passwordPlaceholder: 'Mot de passe de chiffrement',
        button: 'Télécharger la sauvegarde',
        buttonProcessing: 'En cours...'
      },
      restoreSection: {
        title: 'Restaurer les données',
        description: 'Restaurez vos données à partir d’une sauvegarde précédente.',
        warning: 'La restauration remplacera toutes les données actuelles. Assurez-vous de sauvegarder l’état actuel d’abord.',
        button: 'Sélectionner le fichier',
        buttonProcessing: 'En cours...',
        passwordRequired: 'Cette sauvegarde semble chiffrée. Veuillez saisir le mot de passe.',
        confirmRestore: 'ATTENTION : La restauration écrasera toutes les données actuelles. Cette action est irréversible. Êtes-vous sûr ?',
        success: 'Système restauré avec succès. Rechargement...',
        passwordHint: 'Utiliser le mot de passe pour le déchiffrement si nécessaire'
      },
      settings: {
        title: 'Paramètres',
        lastBackup: 'Dernière sauvegarde',
        never: 'Jamais',
        active: 'Actif',
        autoBackup: 'Sauvegarde automatique (Bientôt)',
        autoBackupDesc: 'Sauvegarder automatiquement les données localement.'
      },
      history: {
        title: 'Historique des sauvegardes',
        noHistory: 'Aucun historique disponible',
        table: { date: 'Date', type: 'Type', status: 'Statut', size: 'Taille', details: 'Détails' }
      }
    },
    returnOrderForm: {
      header: { create: 'Créer un bon de retour', edit: 'Modifier le bon de retour' },
      sections: {
        selectDeliveryNote: 'Étape 1 : Sélectionner le bon de livraison',
        selectItems: 'Étape 2 : Sélectionner les articles à retourner',
        returnDetails: 'Étape 3 : Détails du retour',
        summary: 'Résumé du retour'
      },
      labels: {
        deliveryNoteNumber: 'Numéro de BL *',
        selectDeliveryNote: 'Sélectionner un bon de livraison...',
        supplier: 'Fournisseur :',
        poNumber: 'Numéro de commande :',
        deliveryDate: 'Date de livraison :',
        totalAmount: 'Montant total :',
        returnReason: 'Motif du retour *',
        returnMethod: 'Méthode de retour *',
        reasonDetails: 'Détails du motif',
        reasonDetailsPlaceholder: 'Fournir une explication détaillée pour le retour...',
        additionalNotes: 'Notes supplémentaires',
        additionalNotesPlaceholder: 'Toutes notes supplémentaires...',
        item: 'Article',
        sku: 'SKU',
        unitCost: 'Coût unitaire',
        available: 'Disponible',
        returnQty: 'Qté retour',
        itemsToReturn: 'Articles à retourner',
        totalValue: 'Valeur totale',
        processReturn: 'Traiter le retour',
        processing: 'Traitement...',
        cancel: 'Annuler'
      },
      errors: {
        deliveryNoteRequired: 'Veuillez sélectionner un bon de livraison',
        itemsRequired: 'Veuillez sélectionner au moins un article à retourner',
        quantitiesRequired: 'Veuillez spécifier les quantités pour les articles que vous souhaitez retourner',
        submitFailed: 'Échec de la création du bon de retour. Veuillez réessayer.',
        cannotReturnMore: 'Impossible de retourner plus de {{max}} articles'
      },
      warnings: {
        noEligibleNotes: 'Aucun bon de livraison éligible trouvé',
        noEligibleNotesDesc: 'Il n\'y a aucun bon de livraison validé avec des articles disponibles pour le retour.',
        noItemsAvailable: 'Aucun article disponible pour le retour',
        noItemsAvailableDesc: 'Ce bon de livraison ne contient aucun article avec du stock disponible. Tous les articles peuvent être en rupture de stock ou inactifs.'
      },
      reasons: {
        defective: 'Défectueux',
        damaged: 'Endommagé',
        incorrect_item: 'Article incorrect',
        excess_inventory: 'Surstock',
        expired: 'Expiré',
        quality_issue: 'Problème de qualité',
        incorrect_order: 'Commande incorrecte',
        other: 'Autre'
      },
      methods: {
        pickup: 'Enlèvement',
        drop_off: 'Dépôt',
        mail: 'Courrier',
        courier: 'Transporteur'
      }
    },
    returnOrderDetail: {
      title: 'Détails du bon de retour',
      status: {
        requested: 'Demandé',
        approved: 'Approuvé',
        processed: 'Traité',
        completed: 'Terminé',
        cancelled: 'Annulé',
        rejected: 'Rejeté'
      },
      sections: {
        general: 'Informations générales',
        financial: 'Informations financières',
        relatedDocs: 'Documents liés',
        items: 'Articles à retourner',
        history: 'Historique des statuts',
        additional: 'Informations supplémentaires'
      },
      labels: {
        returnNumber: 'Numéro de retour',
        returnDate: 'Date de retour',
        supplier: 'Fournisseur',
        contact: 'Contact',
        reason: 'Motif',
        reasonDetails: 'Détails du motif',
        method: 'Méthode',
        subtotal: 'Sous-total',
        tax: 'TVA',
        total: 'Total',
        shipping: 'Frais de port',
        tracking: 'Suivi',
        carrier: 'Transporteur',
        po: 'Bon de commande',
        invoice: 'Facture fournisseur',
        deliveryNote: 'Bon de livraison',
        notes: 'Notes',
        supplierResponse: 'Réponse fournisseur'
      },
      actions: {
        print: 'Imprimer',
        export: 'Exporter',
        edit: 'Modifier',
        close: 'Fermer',
        save: 'Enregistrer',
        cancel: 'Annuler',
        process: 'Traiter le retour',
        showHistory: 'Afficher l\'historique',
        hideHistory: 'Masquer l\'historique',
        confirmProcess: 'Êtes-vous sûr de vouloir traiter ce bon de retour ? Cela décrémentera l\'inventaire.'
      },
      table: {
        item: 'Article',
        sku: 'SKU',
        qty: 'Qté',
        unitCost: 'Coût unitaire',
        total: 'Total',
        condition: 'État',
        reason: 'Motif'
      },
      messages: {
        createSuccess: 'Bon de retour {{number}} créé avec succès',
        createError: 'Échec de la création du bon de retour : {{error}}',
        updateSuccess: 'Bon de retour mis à jour avec succès',
        updateError: 'Échec de la mise à jour du bon de retour : {{error}}',
        deleteSuccess: 'Bon de retour supprimé avec succès',
        deleteError: 'Échec de la suppression du bon de retour : {{error}}',
        processSuccess: 'Bon de retour traité avec succès',
        processError: 'Échec du traitement du bon de retour : {{error}}',
        deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce bon de retour ?',
        processConfirm: 'Êtes-vous sûr de vouloir traiter ce bon de retour ? Cela décrémentera l\'inventaire.',
        exportSuccess: 'Bons de retour exportés avec succès',
        noReturns: 'Aucun bon de retour trouvé',
        noReturnsDesc: 'Essayez d\'ajuster vos filtres ou créez un nouveau bon de retour'
      }
    },
    brlPricing: {
      header: 'Tarification (BRL) avec frais administratifs',
      exchangeRateLabel: 'Taux de change',
      exchangeRateTooltip: 'Taux de change utilisé pour convertir les prix en BRL',
      sortBy: 'Trier par',
      sort: { base: 'Prix de base (BRL)', admin: 'Frais administratifs (BRL)', total: 'Prix total (BRL)', pct: '% frais' },
      order: { asc: 'Asc', desc: 'Desc' },
      minBaseLabel: 'Base min (R$)',
      th: { description: 'Description', base: 'Prix de base (BRL)', admin: 'Frais administratifs (BRL)', total: 'Prix total (BRL)', pct: '% frais' },
      tip: { base: 'Prix de base converti en BRL selon le taux affiché', adminPrefix: 'Frais administratifs = Base ×', total: 'Total = Base + frais administratifs', pct: 'Pourcentage des frais administratifs par rapport à la base' },
      empty: 'Aucun élément à afficher'
    }
  }
} as const

const get = (obj: any, path: string) => path.split('.')
  .reduce((o, k) => (o && typeof o === 'object' && k in o ? (o as any)[k] : undefined), obj)

export const t = (key: string): string => {
  const val = get(translations.fr, key)
  return typeof val === 'string' ? val : key
}
