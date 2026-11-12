import { FiInbox } from 'react-icons/fi';

const EmptyState = ({ title = 'No data found', message = 'Try adjusting your search or filters.', icon }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    {icon || <FiInbox size={48} className="mb-3" />}
    <h3 className="text-lg font-medium text-gray-600">{title}</h3>
    <p className="text-sm mt-1">{message}</p>
  </div>
);

export default EmptyState;
