import { MessageSquare } from 'lucide-react';
import ComingSoonPage from "../components/common/ComingSoonPage"

export default function ChatPage() {
  return (
    <ComingSoonPage
      icon={MessageSquare}
      title="Chat"
      description="Chat with AI assistants and manage conversations across Telegram, Discord, and WhatsApp."
    />
  );
}
