import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BLReportsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/inventory/manage?tab=delivery-notes', { replace: true });
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Redirection vers le tableau de bord...</p>
    </div>
  );
};

export default BLReportsPage;
