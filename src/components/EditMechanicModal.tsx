import React, { useState, useEffect } from 'react';
import { useMechanicStore, Mechanic } from '../stores/mechanicStore';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EditMechanicModalProps {
  mechanic: Mechanic;
  onClose: () => void;
}

const EditMechanicModal: React.FC<EditMechanicModalProps> = ({ mechanic, onClose }) => {
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [errors, setErrors] = useState<{ name?: string; specialization?: string; phone?: string; hourlyRate?: string }>({});
  const { updateMechanic } = useMechanicStore();

  useEffect(() => {
    if (mechanic) {
      setName(mechanic.name);
      setSpecialization(mechanic.specialization);
      setPhone(mechanic.phone);
      setHourlyRate(mechanic.hourlyRate != null ? String(mechanic.hourlyRate) : '');
    }
  }, [mechanic]);

  const validate = () => {
    const newErrors: { name?: string; specialization?: string; phone?: string; hourlyRate?: string } = {};
    if (!name) newErrors.name = 'Le nom est requis.';
    if (!specialization) newErrors.specialization = 'La spécialisation est requise.';
    if (!phone) {
      newErrors.phone = 'Le téléphone est requis.';
    } else if (!/^0[1-9]([-. ]?[0-9]{2}){4}$/.test(phone)) {
      newErrors.phone = 'Format de téléphone invalide.';
    }
    if (!hourlyRate) {
      newErrors.hourlyRate = 'Le salaire horaire est requis.';
    } else if (isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
      newErrors.hourlyRate = 'Le salaire horaire doit être un nombre positif.';
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Veuillez corriger les erreurs avant de soumettre.');
      return;
    }
    setErrors({});
    const updatedMechanic: Partial<Mechanic> = { name, specialization, phone, hourlyRate: Number(hourlyRate) };
    updateMechanic(mechanic.id, updatedMechanic);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Modifier le mécanicien</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 ${errors.name ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">Spécialisation</label>
            <input
              type="text"
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.specialization ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 ${errors.specialization ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
            />
            {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="text"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 ${errors.phone ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div className="mb-6">
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">Salaire horaire</label>
            <input
              type="number"
              id="hourlyRate"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.hourlyRate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 ${errors.hourlyRate ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
              min="0"
              step="0.01"
            />
            {errors.hourlyRate && <p className="text-red-500 text-xs mt-1">{errors.hourlyRate}</p>}
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMechanicModal;
