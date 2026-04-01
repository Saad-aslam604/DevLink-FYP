import React from 'react';

// Use a generic item type to avoid implicit any and keep the component flexible.
type Conversation = Record<string, unknown>;

interface ConversationsListProps<T extends Conversation = Conversation> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  // pass event so callers can call preventDefault/stopPropagation as needed
  onItemClick?: (item: T, e?: React.MouseEvent) => void;
}

function ConversationsList<T extends Conversation = Conversation>({ items, getKey, renderItem, onItemClick }: ConversationsListProps<T>): React.ReactElement {
  return (
    <div className="conversations-list space-y-2">
      {items.map((item) => {
        const key = String(getKey(item));
        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
              // log to help trace reload/navigation issues
              try { console.log('[ConversationsList] click', { key }); } catch (err) {}
              onItemClick?.(item, e);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} ; onItemClick?.(item, e as any); } }}
            className="conversation-item cursor-pointer"
          >
            {renderItem(item)}
          </div>
        );
      })}
    </div>
  )
}

export default ConversationsList
