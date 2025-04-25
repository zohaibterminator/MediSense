import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { ChatContainer } from "@/components/ChatContainer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NewChatDialog } from "@/components/NewChatDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User } from "lucide-react";

const Index = () => {
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock user data - replace with actual user data from your auth system
  const user = {
    name: "John Doe",
    email: "john@example.com",
  };

  // Create a ref to store the addNewChat function from Sidebar
  const addNewChatRef = useRef<((chatName: string) => void) | null>(null);

  const handleNewChat = (chatName: string) => {
    if (chatName.trim()) {
      // Call the addNewChat function from Sidebar through the ref
      addNewChatRef.current?.(chatName);
      setShowNewChatDialog(false);
    }
  };

  const handleLogout = () => {
    // TODO: Implement actual logout logic
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
        setCurrentChat={setCurrentChat}
        addNewChatRef={addNewChatRef}
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
                <div className="font-medium">{user.name}</div>
                <div className="text-muted-foreground">{user.email}</div>
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
          <ChatContainer chatId={currentChat} />
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
        onSubmit={handleNewChat}
      />
    </div>
  );
};

export default Index;