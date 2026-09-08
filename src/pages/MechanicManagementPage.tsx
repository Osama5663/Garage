import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader, AlertCircle } from 'lucide-react';
import { useMechanicStore, Mechanic } from '../stores/mechanicStore';
import AddMechanicModal from '../components/AddMechanicModal';
import EditMechanicModal from '../components/EditMechanicModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { formatCurrency } from '../utils/formatters';

const MechanicManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const { mechanics, isLoading, error, fetchMechanics, deleteMechanic } = useMechanicStore();

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

  const handleEditClick = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedMechanic) {
      deleteMechanic(selectedMechanic.id);
      setIsDeleteModalOpen(false);
      setSelectedMechanic(null);
    }
  };

  const filteredMechanics = mechanics.filter(mechanic => {
    const matchesSearch = mechanic.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mechanic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Mécaniciens</h1>
          <p className="text-gray-600 mt-1">Ajouter, modifier et gérer les mécaniciens.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="w-5 h-5" />
          <span>Ajouter un mécanicien</span>
        </button>
      </div>

      {isAddModalOpen && <AddMechanicModal onClose={() => setIsAddModalOpen(false)} />}
      {isEditModalOpen && selectedMechanic && <EditMechanicModal mechanic={selectedMechanic} onClose={() => setIsEditModalOpen(false)} />}
      {isDeleteModalOpen && <DeleteConfirmationModal onConfirm={confirmDelete} onClose={() => setIsDeleteModalOpen(false)} />}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un mécanicien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="ml-4 text-gray-600">Chargement des mécaniciens...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spécialisation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salaire horaire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMechanics.length > 0 ? (
                filteredMechanics.map((mechanic) => (
                  <tr key={mechanic.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{mechanic.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{mechanic.specialization}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{mechanic.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mechanic.hourlyRate != null ? `${formatCurrency(mechanic.hourlyRate)}/h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mechanic.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {mechanic.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleEditClick(mechanic)} className="text-indigo-600 hover:text-indigo-900 flex items-center"><Edit className="w-4 h-4 mr-1" /> Modifier</button>
                      <button onClick={() => handleDeleteClick(mechanic)} className="text-red-600 hover:text-red-900 ml-4 flex items-center"><Trash2 className="w-4 h-4 mr-1" /> Supprimer</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun mécanicien trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MechanicManagementPage;
