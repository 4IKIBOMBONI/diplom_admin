import { STATUS_MAP } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || STATUS_MAP.OPEN;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgLight} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} mr-1.5`} />
      {config.label}
    </span>
  );
}
