import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BLFacturePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/inventory/manage?tab=delivery-notes');
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Redirection vers la gestion des BL...</p>
    </div>
  );
};

export default BLFacturePage;
