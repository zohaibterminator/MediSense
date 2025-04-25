import { useState, useImperativeHandle, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquarePlus, Search, Trash2, Edit2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  name: string;
  date: string;
}

interface SidebarProps {
  onNewChat: () => void;
  currentChat: string | null;
  setCurrentChat: (chatId: string | null) => void;
  addNewChatRef: React.MutableRefObject<((chatName: string) => void) | null>;
}

export const Sidebar = ({ 
  onNewChat, 
  currentChat, 
  setCurrentChat,
  addNewChatRef 
}: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();

  const addNewChat = (chatName: string) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: chatName,
      date: new Date().toISOString().split('T')[0],
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChat(newChat.id);
    
    toast({
      title: "Chat created",
      description: `New chat "${chatName}" has been created.`,
    });
  };

  useEffect(() => {
    addNewChatRef.current = addNewChat;
    return () => {
      addNewChatRef.current = null;
    };
  }, [addNewChatRef]);

  const deleteChat = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChat === chatId) {
      setCurrentChat(null);
    }
    
    toast({
      title: "Chat deleted",
      description: "The chat has been deleted successfully.",
    });
  };

  const startEditing = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingName(chat.name);
  };

  const handleRename = (chatId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Chat name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setChatHistory(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, name: editingName }
          : chat
      )
    );

    setEditingChatId(null);
    setEditingName("");

    toast({
      title: "Chat renamed",
      description: "The chat has been renamed successfully.",
    });
  };

  const filteredChats = chatHistory.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'} border-r glass flex flex-col`}>
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          {!isCollapsed && (
            <Button
              onClick={onNewChat}
              className="flex-1 justify-start space-x-2"
              variant="outline"
            >
              <MessageSquarePlus size={20} />
              <span>New Chat</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`${isCollapsed ? 'mx-auto' : ''}`}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChat(chat.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors duration-200 group hover:bg-secondary/80 ${
                currentChat === chat.id ? "bg-secondary" : ""
              }`}
            >
              {editingChatId === chat.id ? (
                <div className="flex gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRename(chat.id);
                      } else if (e.key === "Escape") {
                        setEditingChatId(null);
                        setEditingName("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleRename(chat.id)}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  {!isCollapsed ? (
                    <>
                      <span className="font-medium">{chat.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(chat);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <MessageSquarePlus className="h-4 w-4 mx-auto" />
                  )}
                </div>
              )}
              {!isCollapsed && !editingChatId && (
                <span className="text-sm text-muted-foreground">{chat.date}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};