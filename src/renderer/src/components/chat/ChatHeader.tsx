import { Plus, Trash2 } from 'lucide-react';
import GlassDropdown from '../common/GlassDropdown';
import GlassButton from '../common/GlassButton';

interface ChatHeaderProps {
    selectedAgent: string;
    onAgentChange: (value: string) => void;
    selectedSession: string;
    onSessionChange: (value: string) => void;
}

const agentOptions = [
    { value: 'agent-1', label: 'Default Agent' },
    { value: 'agent-2', label: 'Coding Agent' },
    { value: 'agent-3', label: 'Research Agent' },
];

const sessionOptions = [
    { value: 'session-1', label: 'Session 1' },
    { value: 'session-2', label: 'Session 2' },
    { value: 'session-3', label: 'Session 3' },
];

export default function ChatHeader({
    selectedAgent,
    onAgentChange,
    selectedSession,
    onSessionChange,
}: ChatHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4">
            {/* Left side - Agent dropdown */}
            <GlassDropdown
                label="Agent"
                value={selectedAgent}
                options={agentOptions}
                onChange={onAgentChange}
            />

            {/* Right side - Session dropdown + buttons */}
            <div className="flex items-center gap-3">
                <GlassDropdown
                    label="Session"
                    value={selectedSession}
                    options={sessionOptions}
                    onChange={onSessionChange}
                />

                {/* Action buttons */}
                <GlassButton icon={<Plus size={16} />} title="New session" />
                <GlassButton icon={<Trash2 size={16} />} title="Delete session" />
            </div>
        </div>
    );
}