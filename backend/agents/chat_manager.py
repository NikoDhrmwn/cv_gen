"""
Chat History Manager for Agentic CV Generator

Manages conversation history across all agent interactions:
- Builder agent (initial CV generation)
- Editor agent (AI edit/fix operations)
- Layout agent (section rearrangement)

This enables context-aware AI editing where agents can see the full
conversation history and make better decisions.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json


class ChatMessage:
    """Represents a single message in the conversation."""
    
    def __init__(
        self,
        role: str,  # 'user', 'assistant', 'system'
        content: str,
        message_type: str = 'text',  # 'text', 'edit', 'rearrange', 'build'
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        self.role = role
        self.content = content
        self.message_type = message_type
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'role': self.role,
            'content': self.content,
            'message_type': self.message_type,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChatMessage':
        """Create from dictionary."""
        timestamp = datetime.fromisoformat(data['timestamp']) if 'timestamp' in data else None
        return cls(
            role=data['role'],
            content=data['content'],
            message_type=data.get('message_type', 'text'),
            metadata=data.get('metadata', {}),
            timestamp=timestamp
        )


class ChatManager:
    """
    Manages chat history for CV generation sessions.
    
    Each session represents one CV generation workflow, from initial
    template selection through all edits and exports.
    """
    
    def __init__(self):
        # session_id -> List[ChatMessage]
        self.sessions: Dict[str, List[ChatMessage]] = {}
    
    def create_session(self, session_id: str) -> None:
        """Initialize a new session."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        message_type: str = 'text',
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a message to the session history."""
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        message = ChatMessage(
            role=role,
            content=content,
            message_type=message_type,
            metadata=metadata
        )
        self.sessions[session_id].append(message)
    
    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Get full message history for a session."""
        return self.sessions.get(session_id, [])
    
    def get_history_dict(self, session_id: str) -> List[Dict[str, Any]]:
        """Get history as list of dictionaries."""
        messages = self.get_history(session_id)
        return [msg.to_dict() for msg in messages]
    
    def format_for_prompt(
        self,
        session_id: str,
        max_messages: Optional[int] = None,
        include_system: bool = True
    ) -> str:
        """
        Format chat history as a readable prompt context.
        
        Args:
            session_id: Session to format
            max_messages: Limit to most recent N messages (None = all)
            include_system: Whether to include system messages
        
        Returns:
            Formatted string suitable for including in AI prompts
        """
        messages = self.get_history(session_id)
        
        if not include_system:
            messages = [m for m in messages if m.role != 'system']
        
        if max_messages:
            messages = messages[-max_messages:]
        
        if not messages:
            return "No previous conversation history."
        
        formatted_lines = ["Previous conversation context:"]
        formatted_lines.append("=" * 50)
        
        for msg in messages:
            role_label = {
                'user': 'USER',
                'assistant': 'AGENT',
                'system': 'SYSTEM'
            }.get(msg.role, msg.role.upper())
            
            type_label = f"[{msg.message_type.upper()}]" if msg.message_type != 'text' else ""
            
            formatted_lines.append(f"\n{role_label} {type_label}:")
            formatted_lines.append(msg.content[:500])  # Truncate very long messages
            
            if msg.metadata:
                # Include relevant metadata
                if 'action' in msg.metadata:
                    formatted_lines.append(f"  → Action: {msg.metadata['action']}")
                if 'sections_reordered' in msg.metadata:
                    formatted_lines.append(f"  → Sections reordered: {msg.metadata['sections_reordered']}")
        
        formatted_lines.append("\n" + "=" * 50)
        return "\n".join(formatted_lines)
    
    def format_for_gemini(self, session_id: str, max_messages: Optional[int] = 10) -> List[Dict[str, str]]:
        """
        Format history for Gemini API (Google GenAI format).
        
        Returns list of dicts with 'role' and 'parts' keys.
        Only includes user and assistant messages (system messages become user context).
        
        Args:
            session_id: Session ID
            max_messages: Limit to recent messages for context window management
        """
        messages = self.get_history(session_id)
        
        # Take most recent messages if limit specified
        if max_messages:
            messages = messages[-max_messages:]
        
        formatted = []
        for msg in messages:
            # Gemini uses 'user' and 'model' roles
            if msg.role == 'system':
                # Convert system messages to user context
                role = 'user'
                content = f"[SYSTEM CONTEXT] {msg.content}"
            elif msg.role == 'assistant':
                role = 'model'
                content = msg.content
            else:  # user
                role = 'user'
                content = msg.content
            
            formatted.append({
                'role': role,
                'parts': [{'text': content}]
            })
        
        return formatted
    
    def clear_session(self, session_id: str) -> None:
        """Clear all messages for a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def get_session_count(self) -> int:
        """Get total number of active sessions."""
        return len(self.sessions)
    
    def get_message_count(self, session_id: str) -> int:
        """Get number of messages in a session."""
        return len(self.sessions.get(session_id, []))
    
    def export_session(self, session_id: str) -> str:
        """Export session as JSON string."""
        history = self.get_history_dict(session_id)
        return json.dumps(history, indent=2)
    
    def import_session(self, session_id: str, json_data: str) -> None:
        """Import session from JSON string."""
        data = json.loads(json_data)
        self.sessions[session_id] = [ChatMessage.from_dict(msg) for msg in data]


# Global instance (singleton pattern for simplicity)
# In production, consider using dependency injection or a proper service layer
_chat_manager = None


def get_chat_manager() -> ChatManager:
    """Get the global ChatManager instance."""
    global _chat_manager
    if _chat_manager is None:
        _chat_manager = ChatManager()
    return _chat_manager
