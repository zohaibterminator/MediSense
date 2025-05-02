import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquarePlus, Search, Trash2, Edit2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  title: string; // Changed from 'name' to match backend
  created_at: string; // Changed from 'date' to match backend
}

interface SidebarProps {
  onNewChat: () => void;
  currentChat: string | null;
  setCurrentChat: (chatId: string) => void;
  userId: string | null;
  refreshTrigger: number;
}

export const Sidebar = ({ 
  onNewChat,
  currentChat,
  setCurrentChat,
  userId,
  refreshTrigger,
}: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchChats = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/chat/?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();

      const sortedChats = data.sort((a: Chat, b: Chat) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setChatHistory(sortedChats);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load chats',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [userId, toast]);

  const addNewChat = async (chatName: string) => {
    if (!userId) return;

    try {
      const response = await fetch('${process.env.BACKEND_URL}/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: chatName,
          user_id: userId
        }),
      });

      if (!response.ok) throw new Error('Failed to create chat');
      
      const newChat = await response.json();
      setChatHistory(prev => [newChat, ...prev]);
      setCurrentChat(newChat.id); // Just pass the chat ID
  
      toast({
        title: "Chat created",
        description: `New chat "${chatName}" has been created.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create chat',
        variant: "destructive",
      });
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/chat/delete/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chat');
      
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChat === chatId) {
        setCurrentChat(null);
      }
      
      toast({
        title: "Chat deleted",
        description: "The chat has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete chat',
        variant: "destructive",
      });
    }
  };

  const startEditing = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingName(chat.title);
  };

  const handleRename = async (chatId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Chat name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${process.env.BACKEND_URL}/chat/update/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editingName }),
      });

      if (!response.ok) throw new Error('Failed to rename chat');
      
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? { ...chat, title: editingName }
            : chat
        )
      );
      setEditingChatId(null);
      setEditingName("");

      toast({
        title: "Chat renamed",
        description: "The chat has been renamed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to rename chat',
        variant: "destructive",
      });
    }
  };

  const filteredChats = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              {searchQuery ? "No matching chats found" : "No chats yet"}
            </div>
          ) : (
            filteredChats.map((chat) => (
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
                        <span className="font-medium truncate">{chat.title}</span>
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
                  <span className="text-sm text-muted-foreground">
                    {formatDate(chat.created_at)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};