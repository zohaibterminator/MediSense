import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { ChatContainer } from "@/components/ChatContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NewChatDialog } from "@/components/NewChatDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const Index = () => {
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');

  const handleChatCreated = useCallback((chatId: string) => {
    setCurrentChat(chatId);
    setCurrentMessages([]);
    setRefreshTrigger(prev => prev + 1); // Clear messages for new chat
  }, []);

  const handleChatSelect = async (chatId: string) => {
    setIsLoadingMessages(true);
    setCurrentChat(chatId);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/${chatId}/get_messages`);
      if (response.ok) {
        const messages = await response.json();

        let blobUrl = "";
        if (messages.image_url) {
          const supabase = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY)

          const { data: fileBlob, error } = await supabase
              .storage
              .from('medisense-medical-images')
              .download(messages.image_url);

          if (error) {
              console.error("Failed to download image:", error.message);
            } else if (fileBlob) {
              blobUrl = URL.createObjectURL(fileBlob);
            }
        }

        setCurrentMessages(messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content.text ?? "",
          role: msg.role === "user" ? "user" : "assistant",
          timestamp: new Date(msg.created_at),
          attachments: msg.image_url ? [{
            type: "image",
            url: blobUrl,
            name: msg.image_url.split("/").pop() || "image"
          }] : []
        })));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load messages',
        variant: "destructive",
      });
      setCurrentChat(null);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    setCurrentChat(null);
    setCurrentMessages([]);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onNewChat={() => setShowNewChatDialog(true)}
        currentChat={currentChat}
        setCurrentChat={handleChatSelect}
        userId={userId}
        refreshTrigger={refreshTrigger}
      />
      
      <main className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-6 glass">
          <h1 className="text-xl font-semibold">AI Medical Assistant</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">{userEmail || 'User'}</div>
                <div className="text-muted-foreground">Active</div>
              </div>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        {currentChat ? (
          <ChatContainer 
            chatId={currentChat}
            messages={currentMessages}
            isLoading={isLoadingMessages}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Welcome to AI Medical Assistant</h2>
              <p className="text-muted-foreground">Start a new chat or select an existing one</p>
              <Button onClick={() => setShowNewChatDialog(true)}>
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </main>

      <NewChatDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
};

export default Index;