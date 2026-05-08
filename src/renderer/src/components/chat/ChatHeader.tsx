import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import GlassDropdown from '../common/GlassDropdown';
import GlassButton from '../common/GlassButton';
import CreateSessionModal from './CreateSessionModal';

interface ChatHeaderProps {
    selectedAgent: string;
    onAgentChange: (value: string) => void;
    selectedSession: string;
    onSessionChange: (value: string) => void;
}

export default function ChatHeader({
    selectedAgent,
    onAgentChange,
    selectedSession,
    onSessionChange,
}: ChatHeaderProps) {
    const [agentOptions, setAgentOptions] = useState<{ value: string; label: string }[]>([]);
    const [sessionOptions, setSessionOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch agents on mount
    useEffect(() => {
        async function fetchAgents() {
            try {
                const agents: any[] = await (window as any).everclawAPI.agents.list();
                const options = agents.map(agent => ({
                    value: agent.slug,
                    label: agent.slug === 'main' ? 'main (default)' : agent.slug,
                }));
                setAgentOptions(options);
                
                // Only set default if no agent is selected yet
                if (options.length > 0 && !selectedAgent) {
                    onAgentChange(options[0].value);
                }
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            } finally {
                setIsLoadingAgents(false);
            }
        }
        
        fetchAgents();
    }, [selectedAgent, onAgentChange]);

    // Fetch sessions when agent changes
    useEffect(() => {
        if (!selectedAgent) return;

        async function fetchSessions() {
            setIsLoadingSessions(true);
            try {
                // Ensure main session exists
                await (window as any).everclawAPI.sessions.ensureMain(selectedAgent);
                
                const sessions: string[] = await (window as any).everclawAPI.sessions.list(selectedAgent);
                const options = sessions.map(session => ({
                    value: session,
                    label: session === 'main' ? 'main (default)' : session,
                }));
                setSessionOptions(options);
                
                // Only set default if no session is selected yet
                if (options.length > 0 && !selectedSession) {
                    onSessionChange(options[0].value);
                }
            } catch (error) {
                console.error('Failed to fetch sessions:', error);
            } finally {
                setIsLoadingSessions(false);
            }
        }
        
        fetchSessions();
    }, [selectedAgent]);

    const handleCreateSession = async (name: string) => {
        await (window as any).everclawAPI.sessions.create(selectedAgent, name);
        
        // Refresh sessions list
        const sessions: string[] = await (window as any).everclawAPI.sessions.list(selectedAgent);
        const options = sessions.map(session => ({
            value: session,
            label: session === 'main' ? 'main (default)' : session,
        }));
        setSessionOptions(options);
        
        // Select the new session
        const newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        onSessionChange(newSlug);
    };

    // const handleDeleteSession = async () => {
    //     if (selectedSession === 'main') return;
        
    //     if (confirm('Are you sure you want to delete this session?')) {
    //         try {
    //             await (window as any).everclawAPI.sessions.delete(selectedAgent, selectedSession);
                
    //             // Refresh sessions list
    //             const sessions: string[] = await (window as any).everclawAPI.sessions.list(selectedAgent);
    //             const options = sessions.map(session => ({
    //                 value: session,
    //                 label: session === 'main' ? 'main (default)' : session,
    //             }));
    //             setSessionOptions(options);
                
    //             // Select first session
    //             if (options.length > 0) {
    //                 onSessionChange(options[0].value);
    //             }
    //         } catch (error) {
    //             console.error('Failed to delete session:', error);
    //         }
    //     }
    // };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                {/* Left side - Agent dropdown */}
                {isLoadingAgents ? (
                    <span className="text-sm text-gray-400">Loading agents...</span>
                ) : (
                    <GlassDropdown
                        label="Agent"
                        value={selectedAgent}
                        options={agentOptions}
                        onChange={onAgentChange}
                    />
                )}

                {/* Right side - Session dropdown + buttons */}
                <div className="flex items-center gap-3">
                    {isLoadingSessions ? (
                        <span className="text-sm text-gray-400">Loading...</span>
                    ) : (
                        <>
                            <GlassDropdown
                                label="Session"
                                value={selectedSession}
                                options={sessionOptions}
                                onChange={onSessionChange}
                            />
                            <GlassButton 
                                icon={<Plus size={16} />} 
                                title="New session" 
                                onClick={() => setIsModalOpen(true)}
                            />
                            {/* <GlassButton 
                                icon={<Trash2 size={16} />} 
                                title={selectedSession === 'main' ? 'Cannot delete main session' : 'Delete session'} 
                                onClick={handleDeleteSession}
                            /> */}
                        </>
                    )}
                </div>
            </div>

            <CreateSessionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateSession}
            />
        </>
    );
}