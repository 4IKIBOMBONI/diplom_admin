import { PRIORITY_MAP } from '../../utils/constants';

export default function PriorityBadge({ priority }) {
  const config = PRIORITY_MAP[priority] || PRIORITY_MAP.MEDIUM;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}
